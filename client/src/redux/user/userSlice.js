import { createSlice } from '@reduxjs/toolkit';

// Try to get initial state from localStorage
const getInitialState = () => {
  try {
    const storedUser = localStorage.getItem('currentUser');
    if (storedUser) {
      const parsedUser = JSON.parse(storedUser);
      if (parsedUser && parsedUser.token) {
        return {
          currentUser: parsedUser,
          loading: false,
          error: null,
          isAgent: false,
          isRealEstateCompany: false,
          realEstateCompany: null
        };
      }
    }
  } catch (error) {
    console.error('Error loading user from localStorage:', error);
  }
  return {
    currentUser: null,
    loading: false,
    error: null,
    isAgent: false,
    isRealEstateCompany: false,
    realEstateCompany: null
  };
};

const userSlice = createSlice({
  name: 'user',
  initialState: getInitialState(),
  reducers: {
    signInStart: (state) => {
      state.loading = true;
      state.error = null;
    },
    signInSuccess: (state, action) => {
      state.currentUser = action.payload;
      state.loading = false;
      state.error = null;
      // Set isAgent flag based on the user data
      state.isAgent = action.payload.isAgent || false;
      state.isRealEstateCompany = action.payload.isRealEstateCompany || false;
      
      // Ensure token is properly stored
      const userToStore = {
        ...action.payload,
        token: action.payload.token || action.payload.accessToken
      };
      
      // Store in localStorage
      localStorage.setItem('currentUser', JSON.stringify(userToStore));
      
      // Also store token separately for easy access
      localStorage.setItem('token', userToStore.token);
    },
    signInFailure: (state, action) => {
      state.loading = false;
      state.error = action.payload;
    },
    updateUserStart: (state) => {
      state.loading = true;
      state.error = null;
    },
    updateUserSuccess: (state, action) => {
      state.currentUser = action.payload;
      state.loading = false;
      state.error = null;
      // Update localStorage
      localStorage.setItem('currentUser', JSON.stringify(action.payload));
    },
    updateUserFailure: (state, action) => {
      state.loading = false;
      state.error = action.payload;
    },
    deleteUserStart: (state) => {
      state.loading = true;
      state.error = null;
    },
    deleteUserSuccess: (state) => {
      state.currentUser = null;
      state.loading = false;
      state.error = null;
      // Clear localStorage
      localStorage.removeItem('currentUser');
    },
    deleteUserFailure: (state, action) => {
      state.loading = false;
      state.error = action.payload;
    },
    signOut: (state) => {
      state.currentUser = null;
      state.loading = false;
      state.error = null;
      state.isAgent = false;
      state.isRealEstateCompany = false;
      state.realEstateCompany = null;
      // Clear localStorage
      localStorage.removeItem('currentUser');
      localStorage.removeItem('token');
    },
    realEstateSignInSuccess: (state, action) => {
      state.realEstateCompany = action.payload;
      state.isRealEstateCompany = true;
    },
  },
});

export const {
  signInStart,
  signInSuccess,
  signInFailure,
  updateUserStart,
  updateUserSuccess,
  updateUserFailure,
  deleteUserStart,
  deleteUserSuccess,
  deleteUserFailure,
  signOut,
  realEstateSignInSuccess,
} = userSlice.actions;

export default userSlice.reducer;