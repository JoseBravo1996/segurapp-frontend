import { createNavigationContainerRef } from '@react-navigation/native';

export const navigationRef = createNavigationContainerRef();

export function navigateFromPush(routeName, params) {
  if (navigationRef.isReady()) {
    navigationRef.navigate(routeName, params);
  }
}
