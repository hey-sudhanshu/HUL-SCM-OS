import { create } from 'zustand';

interface MapStore {
  networkData: any;
  setNetworkData: (data: any) => void;
  selectedTruckId: number | null;
  selectedNodeId: string | null;
  hoveredNodeId: string | null;
  selectedLane: {source: string, target: string} | null;
  approvalQueue: any[];
  sourceState: string;
  targetState: string;
  setSelectedTruckId: (id: number | null) => void;
  setSelectedNodeId: (id: string | null) => void;
  setHoveredNodeId: (id: string | null) => void;
  setSelectedLane: (lane: {source: string, target: string} | null) => void;
  addToApprovalQueue: (item: any) => void;
  setSourceState: (state: string) => void;
  setTargetState: (state: string) => void;
}

export const useMapStore = create<MapStore>((set) => ({
  networkData: null,
  setNetworkData: (data) => set({ networkData: data }),
  selectedTruckId: null,
  selectedNodeId: null,
  hoveredNodeId: null,
  selectedLane: null,
  approvalQueue: [],
  sourceState: 'MH',
  targetState: 'CG',
  setSelectedTruckId: (id) => set({ selectedTruckId: id }),
  setSelectedNodeId: (id) => set({ selectedNodeId: id }),
  setHoveredNodeId: (id) => set({ hoveredNodeId: id }),
  setSelectedLane: (lane) => set({ selectedLane: lane }),
  addToApprovalQueue: (item) => set((state) => ({ approvalQueue: [...state.approvalQueue, item] })),
  setSourceState: (state) => set({ sourceState: state }),
  setTargetState: (state) => set({ targetState: state }),
}));
