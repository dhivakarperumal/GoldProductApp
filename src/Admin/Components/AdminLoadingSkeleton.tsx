import { useEffect, useRef } from 'react';
import { Animated, View } from 'react-native';

type SkeletonVariant =
  | 'dashboard'
  | 'list'
  | 'grid'
  | 'detail'
  | 'form'
  | 'compact';

type Props = {
  variant?: SkeletonVariant;
  count?: number;
  className?: string;
};

type BlockProps = {
  opacity: Animated.Value;
  className: string;
};

function SkeletonBlock({ opacity, className }: BlockProps) {
  return (
    <Animated.View
      pointerEvents="none"
      style={{ opacity }}
      className={`rounded-md bg-[#E5EAE6] ${className}`}
    />
  );
}

function ListCard({ opacity }: { opacity: Animated.Value }) {
  return (
    <View className="mb-3 rounded-2xl border border-[#E8D596] bg-white p-4">
      <View className="flex-row items-center">
        <SkeletonBlock opacity={opacity} className="mr-3 h-11 w-11 rounded-full" />
        <View className="flex-1">
          <SkeletonBlock opacity={opacity} className="h-4 w-2/3" />
          <SkeletonBlock opacity={opacity} className="mt-2 h-3 w-1/2" />
        </View>
        <SkeletonBlock opacity={opacity} className="h-5 w-16" />
      </View>
      <SkeletonBlock opacity={opacity} className="mt-4 h-3 w-full" />
      <SkeletonBlock opacity={opacity} className="mt-2 h-3 w-4/5" />
    </View>
  );
}

function GridCard({ opacity }: { opacity: Animated.Value }) {
  return (
    <View className="mb-3 w-[48%] overflow-hidden rounded-xl border border-[#E8D596] bg-white">
      <SkeletonBlock opacity={opacity} className="h-24 w-full rounded-none" />
      <View className="p-3">
        <SkeletonBlock opacity={opacity} className="h-4 w-4/5" />
        <SkeletonBlock opacity={opacity} className="mt-2 h-3 w-3/5" />
        <SkeletonBlock opacity={opacity} className="mt-3 h-8 w-full" />
      </View>
    </View>
  );
}

export default function AdminLoadingSkeleton({
  variant = 'list',
  count = 4,
  className = '',
}: Props) {
  const opacity = useRef(new Animated.Value(0.45)).current;

  useEffect(() => {
    const animation = Animated.timing(opacity, {
      toValue: 0.72,
      duration: 400,
      useNativeDriver: true,
    });
    animation.start();
    return () => animation.stop();
  }, [opacity]);

  const placeholders = Array.from(
    { length: Math.max(1, count) },
    (_, index) => index,
  );

  return (
    <View
      accessible
      accessibilityLabel="Loading admin page"
      className={`w-full ${className}`}
    >
      {variant === 'dashboard' ? (
        <>
          <View className="mb-4 flex-row flex-wrap justify-between">
            {[0, 1, 2, 3].map(index => (
              <View
                key={index}
                className="mb-3 w-[48%] rounded-2xl border border-[#E8D596] bg-white p-4"
              >
                <SkeletonBlock opacity={opacity} className="h-3 w-3/5" />
                <SkeletonBlock opacity={opacity} className="mt-3 h-7 w-4/5" />
                <SkeletonBlock opacity={opacity} className="mt-3 h-3 w-2/5" />
              </View>
            ))}
          </View>
          <View className="mb-4 rounded-2xl border border-[#E8D596] bg-white p-4">
            <SkeletonBlock opacity={opacity} className="h-4 w-2/5" />
            <SkeletonBlock opacity={opacity} className="mt-2 h-3 w-3/5" />
            <SkeletonBlock opacity={opacity} className="mt-5 h-36 w-full" />
          </View>
          {placeholders.slice(0, 2).map(index => (
            <ListCard key={index} opacity={opacity} />
          ))}
        </>
      ) : variant === 'grid' ? (
        <View className="flex-row flex-wrap justify-between">
          {placeholders.map(index => (
            <GridCard key={index} opacity={opacity} />
          ))}
        </View>
      ) : variant === 'detail' ? (
        <>
          <View className="mb-4 rounded-2xl border border-[#E8D596] bg-white p-4">
            <SkeletonBlock opacity={opacity} className="h-6 w-3/5" />
            <SkeletonBlock opacity={opacity} className="mt-3 h-4 w-2/5" />
          </View>
          {placeholders.slice(0, 3).map(index => (
            <ListCard key={index} opacity={opacity} />
          ))}
        </>
      ) : variant === 'form' ? (
        <View className="rounded-2xl border border-[#E8D596] bg-white p-4">
          {placeholders.map(index => (
            <View key={index} className="mb-5">
              <SkeletonBlock opacity={opacity} className="mb-2 h-3 w-1/3" />
              <SkeletonBlock opacity={opacity} className="h-12 w-full rounded-xl" />
            </View>
          ))}
          <SkeletonBlock opacity={opacity} className="mt-2 h-12 w-full rounded-xl" />
        </View>
      ) : variant === 'compact' ? (
        <View className="rounded-2xl border border-[#E8D596] bg-white p-4">
          <SkeletonBlock opacity={opacity} className="h-4 w-2/5" />
          <SkeletonBlock opacity={opacity} className="mt-3 h-3 w-4/5" />
          <SkeletonBlock opacity={opacity} className="mt-2 h-3 w-3/5" />
        </View>
      ) : (
        <>
          <SkeletonBlock opacity={opacity} className="mb-3 h-11 w-full rounded-xl" />
          {placeholders.map(index => (
            <ListCard key={index} opacity={opacity} />
          ))}
        </>
      )}
    </View>
  );
}
