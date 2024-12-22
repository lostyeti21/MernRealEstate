import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { storage } from '../firebase';

export const testFirebaseConnection = async () => {
  try {
    const testBlob = new Blob(['test'], { type: 'text/plain' });
    const storageRef = ref(storage, `test-${Date.now()}.txt`);
    
    await uploadBytes(storageRef, testBlob);
    const url = await getDownloadURL(storageRef);
    
    return {
      success: true,
      message: 'Firebase connection test successful',
      url
    };
  } catch (error) {
    console.error('Firebase test error:', error);
    return {
      success: false,
      error: error.message
    };
  }
}; 