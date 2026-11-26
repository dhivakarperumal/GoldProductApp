import { useRef, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  ImageBackground,
  Pressable,
  ScrollView,
  StatusBar,
  Text,
  View,
  useWindowDimensions,
} from 'react-native';
import type { ScrollViewInstance } from 'react-native';
import {
  ArrowLeft,
  ArrowRight,
  ShieldCheck,
  Sparkles,
} from 'lucide-react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

const WELCOME_SLIDES = [
  {
    image: require('../Assert/Images/Welcome/welcome1.png'),
    title: 'Welcome to Sri GoldSuite',
    description:
      'Your trusted control center for managing every part of your gold business.',
  },
  {
    image: require('../Assert/Images/Welcome/welcome2.png'),
    title: 'Manage shops with ease',
    description:
      'Review shop activity, approvals, and account details from one place.',
  },
  {
    image: require('../Assert/Images/Welcome/welcome3.png'),
    title: 'Keep your business growing',
    description:
      'Stay on top of subscriptions, payments, and revenue with confidence.',
  },
];

type WelcomeProps = {
  onContinue: () => Promise<void>;
};

export default function Welcome({ onContinue }: WelcomeProps) {
  const { width } = useWindowDimensions();
  const scrollRef = useRef<ScrollViewInstance>(null);
  const activeSlideRef = useRef(0);
  const [activeSlide, setActiveSlide] = useState(0);
  const [isContinuing, setIsContinuing] = useState(false);
  const isLastSlide = activeSlide === WELCOME_SLIDES.length - 1;

  const goToSlide = (index: number) => {
    const nextIndex = Math.max(0, Math.min(index, WELCOME_SLIDES.length - 1));
    activeSlideRef.current = nextIndex;
    setActiveSlide(nextIndex);
    scrollRef.current?.scrollTo({ x: nextIndex * width, animated: true });
  };

  const handleContinue = async () => {
    setIsContinuing(true);
    try {
      await onContinue();
    } finally {
      setIsContinuing(false);
    }
  };

  return (
    <ImageBackground
      source={require('../Assert/Images/Welcome/welcome1bg.png')}
      resizeMode="cover"
      className="flex-1"
    >
      <StatusBar
        barStyle="dark-content"
      />
      <SafeAreaView testID="welcome-screen" className="flex-1">
        <View className="flex-1">
          <View className="flex-row items-center justify-between px-6 pt-5">
            <View className="flex-row items-center">
              <View className="mr-3 h-11 w-11 items-center justify-center rounded-full bg-[#123B32]">
                <Sparkles size={21} color="#F5C451" strokeWidth={2} />
              </View>
              
            </View>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Skip welcome slides"
              disabled={isContinuing}
              onPress={handleContinue}
              className="rounded-full border border-[#E8D9B6] bg-white/80 px-4 py-2"
            >
              <Text className="text-xs font-bold text-[#52645B]">Skip</Text>
            </Pressable>
          </View>

          <ScrollView
            ref={scrollRef}
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            onMomentumScrollEnd={event => {
              const index = Math.max(
                0,
                Math.min(
                  Math.round(event.nativeEvent.contentOffset.x / width),
                  WELCOME_SLIDES.length - 1,
                ),
              );
              activeSlideRef.current = index;
              setActiveSlide(index);
            }}
            className="flex-1"
          >
            {WELCOME_SLIDES.map((slide, index) => (
              <View
                key={slide.title}
                style={{ width }}
                className="items-center justify-center px-7 pb-5"
              >
                <Image
                  accessibilityLabel={`Welcome illustration ${index + 1}`}
                  source={slide.image}
                  resizeMode="contain"
                  className="h-[270px] w-full"
                />
                <Text className="mt-6 text-center text-[28px] font-black leading-9 text-[#123B32]">
                  {slide.title}
                </Text>
                <Text className="mt-3 max-w-[310px] text-center text-sm leading-6 text-[#58635D]">
                  {slide.description}
                </Text>
              </View>
            ))}
          </ScrollView>

          <View className="px-7 pb-6 pt-2">
            <View className="mb-5 flex-row items-center justify-center">
              {WELCOME_SLIDES.map((slide, index) => (
                <Pressable
                  key={slide.title}
                  accessibilityRole="button"
                  accessibilityLabel={`Show welcome slide ${index + 1}`}
                  accessibilityState={{ selected: activeSlide === index }}
                  onPress={() => goToSlide(index)}
                  hitSlop={8}
                  className="h-8 w-8 items-center justify-center"
                >
                  <View
                    className={`h-2 rounded-full ${
                      activeSlide === index
                        ? 'w-5 bg-[#B8860B]'
                        : 'w-2 bg-[#D9D2C2]'
                    }`}
                  />
                </Pressable>
              ))}
            </View>

            <View className="flex-row items-center justify-between">
              <Pressable
                testID={isLastSlide ? 'welcome-continue' : 'welcome-next'}
                accessibilityRole="button"
                accessibilityLabel={
                  isLastSlide ? 'Get started' : 'Next welcome slide'
                }
                disabled={isContinuing}
                onPress={
                  isLastSlide
                    ? handleContinue
                    : () => goToSlide(activeSlide + 1)
                }
                className="min-h-12 min-w-[142px] flex-row items-center justify-center rounded-xl bg-[#123B32] px-5 active:opacity-80"
              >
                {isContinuing ? (
                  <ActivityIndicator color="#FFFFFF" />
                ) : (
                  <>
                    <Text className="mr-2 text-sm font-bold text-white">
                      {isLastSlide ? 'Get Started' : 'Next'}
                    </Text>
                    {isLastSlide ? (
                      <ShieldCheck size={18} color="#F5C451" />
                    ) : (
                      <ArrowRight size={18} color="#F5C451" />
                    )}
                  </>
                )}
              </Pressable>
            </View>
          </View>
        </View>
      </SafeAreaView>
    </ImageBackground>
  );
}
