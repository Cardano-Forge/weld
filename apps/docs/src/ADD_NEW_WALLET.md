## Adding a New Wallet

### Requirements

To add a new wallet, you will need the following:

- An `SVG` file of your wallet icon
- A `key` and `display name`
- The wallet's `website URL`

### Steps

1. **Fork the Project**

2. **Add Wallet Icon**

   - Copy your SVG file to the `images/wallets/` directory.
   - Ensure the file name matches the wallet `key`.

3. **Update Wallet List**

   - Append your wallet to the `SUPPORTED_WALLETS` array in `src/lib/mains.ts`.
   - Maintain the correct file format and JSON structure.

   <details>
   <summary><b>Example</b></summary>

   ```typescript
   // ...
   export const SUPPORTED_WALLETS = [
     // ...
     {
       supported: true,
       key: "my_custom_wallet",
       displayName: "My Custom Wallet",
       icon: "https://raw.githubusercontent.com/cardano-forge/weld/main/images/wallets/my_custom_wallet.svg",
       website: "https://ada-anvil.io/",
     },
   ] as const satisfies AbstractWalletInfo[];
   // ...
   ```

   </details>

4. **Test Wallet Integration**

- Update and test the examples in the `documentation/examples/` directory to ensure the wallet integrates correctly.

```bash
npm install
npm run dev
```

Then, navigate to : `http://localhost:5173`

5. **Open a Pull Request**

- Once everything is tested, open a PR on the _Cardano-Forge/weld_ repository.
