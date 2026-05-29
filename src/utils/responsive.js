import { useState, useEffect } from 'react';
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
const WEB_MOBILE_BOTTOM_CUSHION = 6;

function measureWebBottomInset(isMobile) {
  if (Platform.OS !== 'web' || typeof window === 'undefined' || !isMobile) {
    return 0;
  }

  const vv = window.visualViewport;
  if (!vv) {
    return WEB_MOBILE_BOTTOM_CUSHION;
  }

  const obscured = Math.max(0, window.innerHeight - vv.height - vv.offsetTop);
  return obscured > 0 ? obscured + WEB_MOBILE_BOTTOM_CUSHION : WEB_MOBILE_BOTTOM_CUSHION;
}

export function useResponsive() {
  const { width, height } = useWindowDimensions();
  const insets = useSafeAreaInsets();

  const isSmallPhone = width < BREAKPOINTS.sm;
  const isMobile = width < BREAKPOINTS.md;
  const isTablet = width >= BREAKPOINTS.md && width < BREAKPOINTS.lg;
  const isDesktop = width >= BREAKPOINTS.lg;
  const isWide = width >= BREAKPOINTS.xl;
  const isWeb = Platform.OS === 'web';

  const [webBottomInset, setWebBottomInset] = useState(() => measureWebBottomInset(isMobile));

  useEffect(() => {
    if (!isWeb || typeof window === 'undefined') return undefined;

    const update = () => setWebBottomInset(measureWebBottomInset(isMobile));

    update();
    window.visualViewport?.addEventListener('resize', update);
    window.visualViewport?.addEventListener('scroll', update);
    window.addEventListener('resize', update);

    return () => {
      window.visualViewport?.removeEventListener('resize', update);
      window.visualViewport?.removeEventListener('scroll', update);
      window.removeEventListener('resize', update);
    };
  }, [isWeb, isMobile, width, height]);

  const scale = (size) => Math.round((width / BASE_WIDTH) * size);
  const moderateScale = (size, factor = 0.45) =>
    Math.round(size + (scale(size) - size) * factor);

  const contentMaxWidth = isWide ? 960 : isDesktop ? 860 : isTablet ? 720 : width;
  const contentPadding = isSmallPhone ? 14 : isMobile ? 18 : isTablet ? 24 : 32;

  const bottomInset = isWeb ? webBottomInset : insets.bottom;
  const tabBarContentHeight = 58;
  const tabBarHeight = isDesktop ? 0 : tabBarContentHeight + bottomInset + 8;

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
  const { isDesktop, contentPadding, contentMaxWidth } = responsive;

  return {
    padding: contentPadding,
    paddingBottom: isDesktop ? contentPadding + 40 : contentPadding + 24,
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
