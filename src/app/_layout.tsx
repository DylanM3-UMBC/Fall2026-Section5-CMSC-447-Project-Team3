import { Stack, useRouter } from "expo-router";
import { useEffect } from "react";


export default function RootLayout() {

  const router = useRouter()

  let isAuth = false;
  useEffect(() => {
    if(!isAuth){
      router.replace("/(tabs)");
    }
  })

  return (
    <Stack screenOptions={{ headerShown: false }}>
      
      <Stack.Screen name="(tabs)" options={{ orientation: "landscape" }} />
      <Stack.Screen name="(auth)" options={{ orientation: "portrait" }} />
   
    </Stack>
  );
}
