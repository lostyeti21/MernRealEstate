import { combineReducers, configureStore } from '@reduxjs/toolkit';
import { persistStore, persistReducer } from 'redux-persist';
import storage from 'redux-persist/lib/storage';
import userReducer from './user/userSlice';
import realEstateReducer from './realEstate/realEstateSlice';

const persistConfig = {
  key: 'root',
  storage,
  version: 1,
};

// Combine reducers
const rootReducer = combineReducers({
  user: userReducer,
  realEstate: realEstateReducer,
});

// Create persisted reducer
const persistedReducer = persistReducer(persistConfig, rootReducer);

export const store = configureStore({
  reducer: persistedReducer,
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: false,
    }),
});

export const persistor = persistStore(store);
