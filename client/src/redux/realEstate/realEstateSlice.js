import { createSlice } from '@reduxjs/toolkit';

const initialState = {
  currentCompany: null,
  agents: [],
  listings: [],
  loading: false,
  error: null
};

const realEstateSlice = createSlice({
  name: 'realEstate',
  initialState,
  reducers: {
    setLoading: (state, action) => {
      state.loading = action.payload;
    },
    setError: (state, action) => {
      state.error = action.payload;
    },
    setCompanyData: (state, action) => {
      state.currentCompany = action.payload.company;
      state.agents = action.payload.company.agents || [];
      state.listings = action.payload.listings || [];
      state.error = null;
    },
    updateAgent: (state, action) => {
      const index = state.agents.findIndex(agent => agent._id === action.payload._id);
      if (index !== -1) {
        state.agents[index] = action.payload;
      }
    },
    removeAgent: (state, action) => {
      state.agents = state.agents.filter(agent => agent._id !== action.payload);
    },
    addAgent: (state, action) => {
      state.agents.push(action.payload);
    },
    updateCompany: (state, action) => {
      state.currentCompany = action.payload;
    },
    clearRealEstateData: () => initialState
  }
});

export const {
  setLoading,
  setError,
  setCompanyData,
  updateAgent,
  removeAgent,
  addAgent,
  updateCompany,
  clearRealEstateData
} = realEstateSlice.actions;

export default realEstateSlice.reducer; 