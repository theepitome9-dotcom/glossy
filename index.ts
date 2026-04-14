console.log("[index] Project ID is: ", process.env.EXPO_PUBLIC_VIBECODE_PROJECT_ID);
import "react-native-get-random-values";
import { LogBox } from "react-native";
LogBox.ignoreLogs(["Expo AV has been deprecated", "Disconnected from Metro"]);

import { registerRootComponent } from "expo";
import App from "./App";

registerRootComponent(App);
