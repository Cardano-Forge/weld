# Weld Hodei Plugin

This is a plugin for [Weld](https://github.com/cardano-forge/weld) to integrate with the [Hodei client](https://github.com/cardano-forge/hodei-client).

## Installation

```bash
npm install @ada-anvil/weld-plugin-hodei @ada-anvil/weld
```

## Usage

### Vanilla JS

```ts
import { weld } from "@ada-anvil/weld";
import { builtinPlugins } from "@ada-anvil/weld/plugins";
import { hodeiPlugin } from "@ada-anvil/weld-plugin-hodei";

weld.config.update({
  plugins: [...builtinPlugins, hodeiPlugin(config)],
});

weld.init();
```

### React

```tsx
import { weld } from "@ada-anvil/weld";
import { builtinPlugins } from "@ada-anvil/weld/plugins";
import { hodeiPlugin } from "@ada-anvil/weld-plugin-hodei";

export const App = ({ children }) => {
  return (
    <WeldProvider plugins={[...builtinPlugins, hodeiPlugin(config)]}>
      {children}
    </WeldProvider>
  );
};
```

