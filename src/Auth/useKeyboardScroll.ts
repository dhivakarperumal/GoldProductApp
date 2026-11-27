import { useCallback, useEffect, useRef } from 'react';
import {
  Keyboard,
  type ScrollViewInstance,
  type ScrollEvent,
  type TextInputInstance,
} from 'react-native';

export default function useKeyboardScroll() {
  const scrollViewRef = useRef<ScrollViewInstance>(null);
  const focusedInput = useRef<TextInputInstance | null>(null);
  const scrollOffset = useRef(0);
  const keyboardTop = useRef<number | null>(null);

  const scrollFocusedInputIntoView = useCallback((input: TextInputInstance) => {
    const scrollView = scrollViewRef.current;
    const keyboardTopY = keyboardTop.current;
    if (!scrollView || keyboardTopY === null) return;

    input.measureInWindow((_inputX, inputY, _inputWidth, inputHeight) => {
      scrollView.measureInWindow((_scrollX, scrollY, _scrollWidth, scrollHeight) => {
        const visibleTop = scrollY + 8;
        const visibleBottom = Math.min(keyboardTopY, scrollY + scrollHeight) - 16;
        const inputBottom = inputY + inputHeight;
        let nextOffset = scrollOffset.current;

        if (inputY < visibleTop) {
          nextOffset -= visibleTop - inputY;
        } else if (inputBottom > visibleBottom) {
          nextOffset += inputBottom - visibleBottom;
        }

        if (nextOffset !== scrollOffset.current) {
          scrollView.scrollTo({ y: Math.max(0, nextOffset), animated: true });
        }
      });
    });
  }, []);

  const onInputFocus = useCallback(
    (input: TextInputInstance) => {
      focusedInput.current = input;
      scrollFocusedInputIntoView(input);
    },
    [scrollFocusedInputIntoView],
  );

  const onScroll = useCallback((event: ScrollEvent) => {
    scrollOffset.current = event.nativeEvent.contentOffset.y;
  }, []);

  useEffect(() => {
    const showSubscription = Keyboard.addListener('keyboardDidShow', event => {
      keyboardTop.current = event.endCoordinates.screenY;
      if (focusedInput.current !== null) {
        scrollFocusedInputIntoView(focusedInput.current);
      }
    });
    const hideSubscription = Keyboard.addListener('keyboardDidHide', () => {
      keyboardTop.current = null;
      focusedInput.current = null;
    });

    return () => {
      showSubscription.remove();
      hideSubscription.remove();
    };
  }, [scrollFocusedInputIntoView]);

  return { scrollViewRef, onInputFocus, onScroll };
}
