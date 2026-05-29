import { useWindowDimensions, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export const BREAKPOINTS = {
  sm: 380,
  md: 768,
  lg: 1024,
  xl: 1280,
};

export const SIDEBAR_WIDTH = 248;

const BASE_WIDTH = 375;

export function useResponsive() {
  const { width, height } = useWindowDimensions();
  const insets = useSafeAreaInsets();

  const isSmallPhone = width < BREAKPOINTS.sm;
  const isMobile = width < BREAKPOINTS.md;
  const isTablet = width >= BREAKPOINTS.md && width < BREAKPOINTS.lg;
  const isDesktop = width >= BREAKPOINTS.lg;
  const isWide = width >= BREAKPOINTS.xl;
  const isWeb = Platform.OS === 'web';

  const scale = (size) => Math.round((width / BASE_WIDTH) * size);
  const moderateScale = (size, factor = 0.45) =>
    Math.round(size + (scale(size) - size) * factor);

  const contentMaxWidth = isWide ? 960 : isDesktop ? 860 : isTablet ? 720 : width;
  const contentPadding = isSmallPhone ? 14 : isMobile ? 18 : isTablet ? 24 : 32;

  const webBottomFallback = isWeb && isMobile ? 20 : 0;
  const bottomInset = Math.max(insets.bottom, webBottomFallback);
  const tabBarContentHeight = 64;
  const tabBarHeight = isDesktop
    ? 0
    : tabBarContentHeight + bottomInset + (Platform.OS === 'ios' ? 4 : 6);

  return {
    width,
    height,
    isSmallPhone,
    isMobile,
    isTablet,
    isDesktop,
    isWide,
    scale,
    moderateScale,
    contentMaxWidth,
    contentPadding,
    sidebarWidth: SIDEBAR_WIDTH,
    tabBarHeight,
    bottomInset,
    tabBarContentHeight,
    isWeb,
  };
}

export function getScrollContentStyle(responsive, extra = {}) {
  const { isDesktop, tabBarHeight, contentPadding, contentMaxWidth } = responsive;

  return {
    padding: contentPadding,
    paddingBottom: isDesktop ? contentPadding + 40 : tabBarHeight + 16,
    maxWidth: contentMaxWidth,
    width: '100%',
    alignSelf: 'center',
    ...extra,
  };
}

export function getModalWidth(responsive, ratio = 0.9) {
  const { width, isDesktop, isTablet } = responsive;
  const max = isDesktop ? 520 : isTablet ? 480 : 420;
  return Math.min(width * ratio, max);
}

export function getCardWidth(responsive, max = 480) {
  const { width, isMobile } = responsive;
  return Math.min(isMobile ? width * 0.92 : width * 0.88, max);
}
