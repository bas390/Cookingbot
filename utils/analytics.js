import analytics from '@react-native-firebase/analytics';
import perf from '@react-native-firebase/perf';
import crashlytics from '@react-native-firebase/crashlytics';

// Analytics Events
export const logEvent = async (eventName, params = {}) => {
  try {
    await analytics().logEvent(eventName, params);
  } catch (error) {
    console.error('Analytics Error:', error);
  }
};

// Screen Tracking
export const logScreenView = async (screenName, screenClass) => {
  try {
    await analytics().logScreenView({
      screen_name: screenName,
      screen_class: screenClass,
    });
  } catch (error) {
    console.error('Screen Tracking Error:', error);
  }
};

// Performance Monitoring
export const startTrace = async (traceName) => {
  try {
    const trace = await perf().startTrace(traceName);
    return trace;
  } catch (error) {
    console.error('Performance Trace Error:', error);
    return null;
  }
};

// Image Loading Performance
export const measureImageLoad = async (imageUrl) => {
  const trace = await startTrace('image_load');
  if (!trace) return;

  try {
    trace.putAttribute('url', imageUrl);
    await fetch(imageUrl);
    await trace.stop();
  } catch (error) {
    console.error('Image Load Error:', error);
    await trace.stop();
  }
};

// Network Request Performance
export const measureNetworkRequest = async (requestName, request) => {
  const metric = await perf().newHttpMetric(request.url, request.method);
  
  try {
    await metric.start();
    const response = await fetch(request.url, request);
    await metric.setHttpResponseCode(response.status);
    await metric.stop();
    return response;
  } catch (error) {
    console.error('Network Request Error:', error);
    await metric.stop();
    throw error;
  }
};

// Crash Reporting
export const logError = async (error, context = {}) => {
  try {
    await crashlytics().log(JSON.stringify(context));
    await crashlytics().recordError(error);
  } catch (e) {
    console.error('Crash Reporting Error:', e);
  }
};

// User Properties
export const setUserProperties = async (properties) => {
  try {
    Object.entries(properties).forEach(async ([key, value]) => {
      await analytics().setUserProperty(key, value);
    });
  } catch (error) {
    console.error('User Properties Error:', error);
  }
};

// Cache Management
export const clearImageCache = async () => {
  try {
    const cacheDir = FileSystem.cacheDirectory + 'images/';
    await FileSystem.deleteAsync(cacheDir, { idempotent: true });
  } catch (error) {
    console.error('Cache Clear Error:', error);
  }
};

// Performance Optimization
export const optimizeImage = async (imageUri, quality = 0.7) => {
  try {
    const manipResult = await ImageManipulator.manipulateAsync(
      imageUri,
      [{ resize: { width: 1024 } }],
      { compress: quality, format: ImageManipulator.SaveFormat.JPEG }
    );
    return manipResult.uri;
  } catch (error) {
    console.error('Image Optimization Error:', error);
    return imageUri;
  }
}; 