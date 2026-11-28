import AsyncStorage from "@react-native-async-storage/async-storage";
import { createClient } from "@supabase/supabase-js";
import { Platform } from "react-native";
import "react-native-url-polyfill/auto";

export const supabase = createClient(
  process.env.EXPO_PUBLIC_SUPABASE_URL!,
  process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
  {
    auth: {
      ...(Platform.OS !== "web" ? { storage: AsyncStorage } : {}),
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: false
    },
  },
);

export const API_URL = 'http://127.0.0.1:8000';
export const MAX_FILE_SIZE = 10 * 1024 * 1024;