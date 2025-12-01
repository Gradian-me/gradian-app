import { TextSwitcher } from './text-switcher';

export function TextSwitcherBasic() {
  return (
    <TextSwitcher 
      texts={['Generating code...', 'Processing data...', 'Almost done...']}
      className="font-mono text-sm"
      switchInterval={3000}
    />
  );
}

export function TextSwitcherSingle() {
  return (
    <TextSwitcher 
      texts="Loading..."
      className="font-mono text-sm"
    />
  );
}

export function TextSwitcherCustom() {
  return (
    <TextSwitcher 
      texts={['A', 'B', 'C']}
      className="text-2xl font-bold"
      switchInterval={2000}
      transitionDuration={0.3}
      shimmerDuration={0.8}
      as="h1"
    />
  );
}

