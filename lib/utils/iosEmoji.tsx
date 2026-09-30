'use client';

import React from 'react';

// Apple Emoji CDN base from jsdelivr emoji-datasource-apple
const APPLE_EMOJI_CDN = 'https://cdn.jsdelivr.net/npm/emoji-datasource-apple@15.1.2/img/apple/64';

// Regex to capture all Unicode emoji characters, ZWJ sequences, skin tones, and variation selectors
export const EMOJI_REGEX = /(?:\p{Extended_Pictographic}|\p{Emoji_Presentation}|\p{Emoji}\uFE0F)(?:\u200D(?:\p{Extended_Pictographic}|\p{Emoji_Presentation}|\p{Emoji}\uFE0F)|\uFE0F|[\u{1F3FB}-\u{1F3FF}])*/gu;

/**
 * Converts a Unicode emoji sequence into unified lowercase hex format (e.g. "1f44d", "2764-fe0f")
 */
export function emojiToUnifiedCode(emoji: string): string {
  const codePoints: string[] = [];
  for (let i = 0; i < emoji.length; i++) {
    const cp = emoji.codePointAt(i);
    if (cp !== undefined) {
      codePoints.push(cp.toString(16).toLowerCase());
      if (cp > 0xffff) {
        i++; // skip second byte of surrogate pair
      }
    }
  }
  return codePoints.join('-');
}

/**
 * Returns the CDN URL for the Apple/iOS version of the given emoji.
 */
export function getIosEmojiUrl(emoji: string): string {
  const code = emojiToUnifiedCode(emoji);
  return `${APPLE_EMOJI_CDN}/${code}.png`;
}

interface IosEmojiProps {
  emoji: string;
  className?: string;
  size?: number | string;
  style?: React.CSSProperties;
}

/**
 * Standalone iOS Apple Emoji Component.
 * Displays high-resolution Apple Emoji image with seamless fallback.
 */
export function IosEmoji({
  emoji,
  className = '',
  size,
  style,
}: IosEmojiProps) {
  const [error, setError] = React.useState(false);
  const src = getIosEmojiUrl(emoji);

  if (error) {
    return <span className={className} style={style}>{emoji}</span>;
  }

  const dimensionStyle = size
    ? { width: typeof size === 'number' ? `${size}px` : size, height: typeof size === 'number' ? `${size}px` : size }
    : {};

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt={emoji}
      loading="lazy"
      decoding="async"
      onError={() => setError(true)}
      className={`inline-block w-[1.25em] h-[1.25em] align-[-0.2em] mx-[0.06em] select-none object-contain pointer-events-none ${className}`}
      style={{ ...dimensionStyle, ...style }}
    />
  );
}

/**
 * Replaces all Unicode emojis in a plain string with Apple/iOS emoji elements.
 */
export function renderTextWithIosEmojis(text: string): React.ReactNode {
  if (!text) return text;
  
  // Quick test: if string has no emoji, return string directly for maximum performance
  if (!text.match(EMOJI_REGEX)) {
    return text;
  }

  const parts: React.ReactNode[] = [];
  let lastIndex = 0;
  const regex = new RegExp(EMOJI_REGEX.source, 'gu');
  let match: RegExpExecArray | null;

  while ((match = regex.exec(text)) !== null) {
    const matchIndex = match.index;
    const emoji = match[0];

    // Push text preceding the emoji
    if (matchIndex > lastIndex) {
      parts.push(text.slice(lastIndex, matchIndex));
    }

    // Push the iOS Emoji element
    parts.push(
      <IosEmoji
        key={`ios-emoji-${matchIndex}-${emoji}`}
        emoji={emoji}
      />
    );

    lastIndex = matchIndex + emoji.length;
  }

  // Push remaining trailing text
  if (lastIndex < text.length) {
    parts.push(text.slice(lastIndex));
  }

  return parts;
}

/**
 * Recursively inspects React children and replaces any string containing emojis with iOS emoji images.
 */
export function renderChildrenWithIosEmoji(children: React.ReactNode): React.ReactNode {
  if (typeof children === 'string') {
    return renderTextWithIosEmojis(children);
  }
  if (Array.isArray(children)) {
    return React.Children.map(children, (child) => renderChildrenWithIosEmoji(child));
  }
  if (React.isValidElement(children) && (children.props as any)?.children) {
    const el = children as React.ReactElement<any>;
    return React.cloneElement(el, el.props, renderChildrenWithIosEmoji(el.props.children));
  }
  return children;
}
