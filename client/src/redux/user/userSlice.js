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
      
      // Enhanced token extraction and logging
      console.group('Sign In Success Debug');
      console.log('Payload:', action.payload);
      
      // Extract token
      const token = action.payload.access_token || action.payload.token;
      
      // Set isAgent flag based on payload
      state.isAgent = action.payload.isAgent || false;
      
      // Store token and user data
      if (token) {
        // Store token based on user type
        if (state.isAgent) {
          localStorage.setItem('agent_token', token);
        } else {
          localStorage.setItem('access_token', token);
        }
      }
      
      // Store user data with token
      localStorage.setItem('currentUser', JSON.stringify({
        ...action.payload,
        token,
        isAgent: state.isAgent
      }));
      
      console.log('Updated state:', {
        token,
        isAgent: state.isAgent,
        currentUser: state.currentUser
      });
      console.groupEnd();
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
      localStorage.removeItem('access_token');
      localStorage.removeItem('isLandlord');
    },
    realEstateSignInSuccess: (state, action) => {
      // Ensure payload is an object
      const payload = action.payload || {};
      
      // Set real estate company data
      state.realEstateCompany = payload;
      state.isRealEstateCompany = true;
      
      // Store token if available
      const token = payload.token || payload.accessToken;
      if (token) {
        localStorage.setItem('access_token', token);
        localStorage.setItem('realEstateToken', token);
      }
      
      // Store full company data in localStorage
      try {
        localStorage.setItem('realEstateCompany', JSON.stringify(payload));
      } catch (error) {
        console.error('Error storing real estate company data:', error);
      }
      
      // Reset any previous errors
      state.error = null;
      state.loading = false;
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