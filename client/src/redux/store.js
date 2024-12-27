import { configureStore } from '@reduxjs/toolkit';
import userReducer from './user/userSlice';
import { persistStore, persistReducer } from 'redux-persist';
import storage from 'redux-persist/lib/storage';

// Load initial state from localStorage
let preloadedState = {};
try {
  const storedUser = localStorage.getItem('currentUser');
  if (storedUser) {
    preloadedState = {
      user: {
        currentUser: JSON.parse(storedUser),
        loading: false,
        error: null
      }
    };
  }
} catch (error) {
  console.error('Error loading persisted state:', error);
}

// Configuration for Redux Persist
const persistConfig = {
  key: 'root',
  storage,
  whitelist: ['user'] // Only persist user reducer
};

// Create persisted reducer
const persistedReducer = persistReducer(persistConfig, userReducer);

// Create store with middleware configuration
export const store = configureStore({
  reducer: {
    user: persistedReducer
  },
  preloadedState,
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: {
        ignoredActions: ['persist/PERSIST', 'persist/REHYDRATE']
      }
    })
});

// Initialize persistor after store creation
export const persistor = persistStore(store, null, () => {
  console.log('Rehydration complete');
  console.log('Current state:', store.getState());
});
