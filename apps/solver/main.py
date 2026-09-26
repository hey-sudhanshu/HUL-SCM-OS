import json
import os
import networkx as nx
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Dict, Any
from itertools import islice
from ortools.constraint_solver import routing_enums_pb2
from ortools.constraint_solver import pywrapcp
import math

def haversine(coord1, coord2):
    lat1, lon1 = coord1
    lat2, lon2 = coord2
    R = 6371
    dlat = math.radians(lat2 - lat1)
    dlon = math.radians(lon2 - lon1)
    a = math.sin(dlat/2)**2 + math.cos(math.radians(lat1)) * math.cos(math.radians(lat2)) * math.sin(dlon/2)**2
    c = 2 * math.atan2(math.sqrt(a), math.sqrt(1-a))
    return R * c

app = FastAPI(title="HUL SCM Solver API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Load network data into memory for solver use
DATA_PATH = os.path.join(os.path.dirname(__file__), '../../data/network.json')
with open(DATA_PATH, 'r') as f:
    network_data = json.load(f)

# Build NetworkX graph for Yen's k-shortest paths
G = nx.DiGraph()
for l in network_data["lanes"]:
    # Add nodes if not present
    G.add_node(l["source_id"])
    G.add_node(l["dest_id"])
    # Edge weight is cost_per_trip, we also store distance and time
    G.add_edge(l["source_id"], l["dest_id"], 
               weight=l["cost_per_trip"], 
               distance=l["distance_km"],
               time=l["actual_transit_mean"])

@app.get("/health")
def health_check():
    return {"status": "ok", "service": "HUL SCM Solver API"}

class PathRequest(BaseModel):
    source: str
    target: str
    k: int = 3

@app.post("/api/routes/k-shortest")
def k_shortest_paths(req: PathRequest):
    if req.source not in G or req.target not in G:
        raise HTTPException(status_code=404, detail="Source or target not in network")
    
    try:
        paths = list(islice(nx.shortest_simple_paths(G, req.source, req.target, weight="weight"), req.k))
        results = []
        for p in paths:
            total_cost = 0
            total_dist = 0
            total_time = 0
            edges = []
            for i in range(len(p)-1):
                u, v = p[i], p[i+1]
                data = G[u][v]
                total_cost += data["weight"]
                total_dist += data["distance"]
                total_time += data["time"]
                edges.append({"source": u, "target": v, "cost": data["weight"], "distance": data["distance"]})
            results.append({
                "path": p,
                "total_cost": total_cost,
                "total_distance": total_dist,
                "total_time": total_time,
                "edges": edges
            })
        return {"paths": results}
    except nx.NetworkXNoPath:
        return {"paths": []}

class CVRPRequest(BaseModel):
    depot: str
    locations: List[str] # Includes depot at index 0 usually, but we'll build matrix
    demands_kg: List[float] # Demand per location
    demands_m3: List[float]
    vehicle_capacity_kg: float
    vehicle_capacity_m3: float
    num_vehicles: int

@app.post("/api/routes/cvrp")
def solve_cvrp(req: CVRPRequest):
    import math
    def _haversine_local(coord1, coord2):
        R = 6371; lat1, lon1 = coord1; lat2, lon2 = coord2
        dlat = math.radians(lat2 - lat1); dlon = math.radians(lon2 - lon1)
        a = math.sin(dlat/2)**2 + math.cos(math.radians(lat1)) * math.cos(math.radians(lat2)) * math.sin(dlon/2)**2
        return R * 2 * math.atan2(math.sqrt(a), math.sqrt(1-a))
    # Find coords
    nodes = {}
    for w in network_data["warehouses"]: nodes[w["id"]] = w["coordinates"]
    for d in network_data["distributors"]: nodes[d["id"]] = d["coordinates"]
    for p in network_data["plants"]: nodes[p["id"]] = p["coordinates"]

    locs = req.locations
    n = len(locs)
    dist_matrix = [[0]*n for _ in range(n)]
    for i in range(n):
        for j in range(n):
            if i != j:
                c1 = nodes.get(locs[i])
                c2 = nodes.get(locs[j])
                if c1 and c2:
                    dist_matrix[i][j] = int(haversine(c1, c2) * 1.3) # 1.3 multiplier

    data = {
        "distance_matrix": dist_matrix,
        "demands_kg": [int(d) for d in req.demands_kg],
        "demands_m3": [int(d*100) for d in req.demands_m3], # scale to int
        "vehicle_capacities_kg": [int(req.vehicle_capacity_kg)] * req.num_vehicles,
        "vehicle_capacities_m3": [int(req.vehicle_capacity_m3*100)] * req.num_vehicles,
        "num_vehicles": req.num_vehicles,
        "depot": 0 # index 0 is depot
    }

    manager = pywrapcp.RoutingIndexManager(len(data['distance_matrix']), data['num_vehicles'], data['depot'])
    routing = pywrapcp.RoutingModel(manager)

    def distance_callback(from_index, to_index):
        return data['distance_matrix'][manager.IndexToNode(from_index)][manager.IndexToNode(to_index)]
    transit_callback_index = routing.RegisterTransitCallback(distance_callback)
    routing.SetArcCostEvaluatorOfAllVehicles(transit_callback_index)

    # Add Weight Constraint
    def weight_callback(from_index):
        return data['demands_kg'][manager.IndexToNode(from_index)]
    weight_callback_index = routing.RegisterUnaryTransitCallback(weight_callback)
    routing.AddDimensionWithVehicleCapacity(weight_callback_index, 0, data['vehicle_capacities_kg'], True, 'Weight')

    # Add Volume Constraint
    def volume_callback(from_index):
        return data['demands_m3'][manager.IndexToNode(from_index)]
    volume_callback_index = routing.RegisterUnaryTransitCallback(volume_callback)
    routing.AddDimensionWithVehicleCapacity(volume_callback_index, 0, data['vehicle_capacities_m3'], True, 'Volume')

    search_parameters = pywrapcp.DefaultRoutingSearchParameters()
    search_parameters.time_limit.seconds = 3
    search_parameters.first_solution_strategy = routing_enums_pb2.FirstSolutionStrategy.PATH_CHEAPEST_ARC

    solution = routing.SolveWithParameters(search_parameters)
    if not solution:
        return {"status": "infeasible"}

    routes = []
    total_distance = 0
    for vehicle_id in range(data['num_vehicles']):
        index = routing.Start(vehicle_id)
        route = []
        route_dist = 0
        while not routing.IsEnd(index):
            node_index = manager.IndexToNode(index)
            route.append(locs[node_index])
            previous_index = index
            index = solution.Value(routing.NextVar(index))
            route_dist += routing.GetArcCostForVehicle(previous_index, index, vehicle_id)
        route.append(locs[manager.IndexToNode(index)])
        if len(route) > 2: # More than just Start -> End
            routes.append({"vehicle": vehicle_id, "route": route, "distance": route_dist})
            total_distance += route_dist

    return {"status": "optimal", "routes": routes, "total_distance": total_distance}

class BinPackingRequest(BaseModel):
    items_weight: List[float]
    items_volume: List[float]
    bin_capacity_weight: float
    bin_capacity_volume: float

@app.post("/api/routes/bin-packing")
def bin_packing(req: BinPackingRequest):
    # First-Fit Decreasing heuristic for 2D Bin Packing (Weight/Volume)
    items = sorted(
        [{"id": i, "w": w, "v": v} for i, (w, v) in enumerate(zip(req.items_weight, req.items_volume))],
        key=lambda x: x["w"] / req.bin_capacity_weight + x["v"] / req.bin_capacity_volume, 
        reverse=True
    )
    
    bins = []
    for item in items:
        placed = False
        for b in bins:
            if b["weight"] + item["w"] <= req.bin_capacity_weight and b["volume"] + item["v"] <= req.bin_capacity_volume:
                b["items"].append(item["id"])
                b["weight"] += item["w"]
                b["volume"] += item["v"]
                placed = True
                break
        if not placed:
            bins.append({"id": len(bins), "items": [item["id"]], "weight": item["w"], "volume": item["v"]})
            
    return {"bins": bins, "total_bins": len(bins)}

class DispatchRequest(BaseModel):
    depots: List[str]
    locations: List[str]
    demands_kg: List[float]
    demands_m3: List[float]
    time_windows_start: List[int]
    time_windows_end: List[int]
    vehicle_capacities_kg: List[float]
    vehicle_capacities_m3: List[float]
    vehicle_fixed_costs: List[float]
    max_driving_hours: int = 9 # Motor Transport Workers Act 1961
    two_drivers: bool = False

@app.post("/api/routes/dispatch")
def solve_dispatch(req: DispatchRequest):
    import math
    def _haversine_local(coord1, coord2):
        lat1, lon1 = coord1
        lat2, lon2 = coord2
        R = 6371
        dlat = math.radians(lat2 - lat1)
        dlon = math.radians(lon2 - lon1)
        a = math.sin(dlat/2)**2 + math.cos(math.radians(lat1)) * math.cos(math.radians(lat2)) * math.sin(dlon/2)**2
        c = 2 * math.atan2(math.sqrt(a), math.sqrt(1-a))
        return R * c
    
        # 1. Real distances using road_matrix
    import json
    with open("data/road_matrix.json", "r") as f:
        road_matrix = json.load(f)["matrix"]
            
    n = len(req.locations)
    distance_matrix = [[0]*n for _ in range(n)]
    time_matrix = [[0]*n for _ in range(n)]
        
    for i in range(n):
        for j in range(n):
            loc1 = req.locations[i]
            loc2 = req.locations[j]
            if loc1 == loc2:
                distance_matrix[i][j] = 0
                time_matrix[i][j] = 0
            else:
                dist = road_matrix.get(loc1, {}).get(loc2, {}).get("distance_km", 9999)
                dur = road_matrix.get(loc1, {}).get(loc2, {}).get("duration_hours", 9999)
                distance_matrix[i][j] = dist
                time_matrix[i][j] = int(math.ceil(dur))


    
    num_vehicles = len(req.vehicle_capacities_kg)
    depot_idx = 0 # Using first location as depot for simplicity in this demo
    
    manager = pywrapcp.RoutingIndexManager(n, num_vehicles, depot_idx)
    routing = pywrapcp.RoutingModel(manager)

    # 2. Distance & Cost Callback
    def distance_callback(from_index, to_index):
        from_node = manager.IndexToNode(from_index)
        to_node = manager.IndexToNode(to_index)
        return distance_matrix[from_node][to_node]
    transit_callback_index = routing.RegisterTransitCallback(distance_callback)
    
    for v in range(num_vehicles):
        routing.SetFixedCostOfVehicle(int(req.vehicle_fixed_costs[v]), v)
        routing.SetArcCostEvaluatorOfVehicle(transit_callback_index, v)

    # 3. Time Windows & Driving Hours & E-Way Bill
    def time_callback(from_index, to_index):
        from_node = manager.IndexToNode(from_index)
        to_node = manager.IndexToNode(to_index)
        return time_matrix[from_node][to_node]
    time_callback_index = routing.RegisterTransitCallback(time_callback)
    # Driving Dimension (excluding wait times)
    def driving_callback(from_index, to_index):
        from_node = manager.IndexToNode(from_index)
        to_node = manager.IndexToNode(to_index)
        # return driving time (no wait time included)
        return time_matrix[from_node][to_node]
        
    driving_callback_index = routing.RegisterTransitCallback(driving_callback)
    routing.AddDimension(
        driving_callback_index,
        0, # no slack allowed
        (req.max_driving_hours * 2) if req.two_drivers else req.max_driving_hours,
        True,
        "Driving"
    )
    

    # Weight
    def weight_callback(from_index):
        node = manager.IndexToNode(from_index)
        return int(req.demands_kg[node])
    weight_cb_idx = routing.RegisterUnaryTransitCallback(weight_callback)
    routing.AddDimensionWithVehicleCapacity(
        weight_cb_idx,
        0,
        [int(c) for c in req.vehicle_capacities_kg],
        True,
        "Weight"
    )

    # Volume
    def vol_callback(from_index):
        node = manager.IndexToNode(from_index)
        return int(req.demands_m3[node])
    vol_cb_idx = routing.RegisterUnaryTransitCallback(vol_callback)
    routing.AddDimensionWithVehicleCapacity(
        vol_cb_idx,
        0,
        [int(c) for c in req.vehicle_capacities_m3],
        True,
        "Volume"
    )

    # Enforce return leg explicitly
    driving_dim = routing.GetDimensionOrDie("Driving")
    for vehicle_id in range(num_vehicles):
        end_index = routing.End(vehicle_id)
        max_limit = (req.max_driving_hours * 2) if req.two_drivers else req.max_driving_hours
        driving_dim.CumulVar(end_index).SetMax(max_limit)

    
    max_route_time = 168
    
    routing.AddDimension(
        time_callback_index,
        24, # max wait time
        max_route_time,
        False,
        "Time"
    )
    time_dimension = routing.GetDimensionOrDie("Time")
    
    for i in range(n):
        index = manager.NodeToIndex(i)
        #time_dimension.CumulVar(index).SetRange(req.time_windows_start[i], req.time_windows_end[i])
        
        # E-Way Bill Constraint: ~1 day (24h) per 200km.
        dist_from_depot = distance_matrix[depot_idx][i]
        allowed_hours = max(24, int(math.ceil(dist_from_depot / 200.0) * 24) + 24) # Relax e-way slightly
        curr_max = time_dimension.CumulVar(index).Max()
        #time_dimension.CumulVar(index).SetMax(min(curr_max, allowed_hours))

    for i in range(num_vehicles):
        routing.AddVariableMinimizedByFinalizer(time_dimension.CumulVar(routing.Start(i)))
        routing.AddVariableMinimizedByFinalizer(time_dimension.CumulVar(routing.End(i)))

    # 4. Capacity
    def weight_callback(from_index):
        node = manager.IndexToNode(from_index)
        return int(req.demands_kg[node])
    weight_callback_index = routing.RegisterUnaryTransitCallback(weight_callback)
    
    routing.AddDimensionWithVehicleCapacity(
        weight_callback_index,
        0,
        [int(c) for c in req.vehicle_capacities_kg],
        True,
        "Weight"
    )
    
    search_parameters = pywrapcp.DefaultRoutingSearchParameters()
    search_parameters.time_limit.seconds = 3
    search_parameters.first_solution_strategy = routing_enums_pb2.FirstSolutionStrategy.PATH_CHEAPEST_ARC
    
    solution = routing.SolveWithParameters(search_parameters)
    
    if not solution:
        return {"status": "infeasible", "routes": []}
        
    routes = []
    total_time = 0
    for v in range(num_vehicles):
        index = routing.Start(v)
        schedule = []
        route_dist = 0
        while not routing.IsEnd(index):
            node = manager.IndexToNode(index)
            time_var = time_dimension.CumulVar(index)
            arr = solution.Min(time_var)
            dep = arr + 1 if node != depot_idx else arr
            
            schedule.append({
                "loc": req.locations[node],
                "arrival_time": arr,
                "departure_time": dep
            })
            prev_index = index
            index = solution.Value(routing.NextVar(index))
            route_dist += routing.GetArcCostForVehicle(prev_index, index, v)
            
        node = manager.IndexToNode(index)
        time_var = time_dimension.CumulVar(index)
        arr = solution.Min(time_var)
        schedule.append({
            "loc": req.locations[node],
            "arrival_time": arr,
            "departure_time": arr
        })
        
        if len(schedule) > 2:
            total_time += arr
            routes.append({"vehicle": v, "schedule": schedule})
            
    return {"status": "optimal", "routes": routes, "total_time": total_time}
