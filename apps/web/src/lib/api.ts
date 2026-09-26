import { useOSStore } from './store/os';

const API_BASE = 'http://localhost:8000';

export async function checkSolverHealth(): Promise<boolean> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 2000);
    const res = await fetch(`${API_BASE}/health`, { 
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
      signal: controller.signal,
    });
    clearTimeout(timeout);
    if (res.ok) {
      useOSStore.getState().setLiveSolver(true);
      return true;
    }
  } catch (err) {
    console.warn("Solver not responding, falling back to cached precomputed data.");
  }
  useOSStore.getState().setLiveSolver(false);
  return false;
}

export async function fetchNetworkData() {
  const isLive = await checkSolverHealth();
  
  if (isLive) {
    // In future phases, this might hit a /network endpoint on the FastAPI solver
    // For now, even if live, we just return the precomputed data to simulate the structure
    console.log("Solver is live. Fetching data...");
  } else {
    console.log("Solver is offline. Loading cached network data.");
  }
  
  // Load fallback data
  const res = await fetch('/precomputed/network.json');
  // Load demand dynamically to keep bundle/initial payload small
  let demand_history = {};
  try {
    const dRes = await fetch('/precomputed/network_demand.json');
    if(dRes.ok) {
       demand_history = (await dRes.json()).demand_history;
    }
  } catch(e) { console.error("Error loading demand", e); }

  let road_matrix = {};
  try {
    const rRes = await fetch('/precomputed/road_matrix.json');
    if(rRes.ok) {
       road_matrix = (await rRes.json()).matrix;
    }
  } catch(e) { console.error("Error loading road matrix", e); }

  const networkData = await res.json();
  networkData.demand_history = demand_history;
  networkData.road_matrix = road_matrix;
  return networkData;
}
