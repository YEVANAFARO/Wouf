/**
 * WOUF — Main App Entry Point
 * ═══════════════════════════════
 * Navigation + Auth state management + Theme
 */

import React, { useState, useEffect, useCallback, useContext, useRef } from 'react';
import { StatusBar } from 'expo-status-bar';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { View, Text, ActivityIndicator, Platform } from 'react-native';
import { supabase, auth } from './src/config/supabase';
import { DARK, LIGHT } from './src/config/theme';
import { ThemeContext, AuthContext, DogsContext } from './src/context/appContexts';
import { profileService } from './src/services/database';

// ── Screens ────────────────────────────────────────────────
import OnboardingScreen from './src/screens/onboarding/OnboardingScreen';
import AuthScreen from './src/screens/auth/AuthScreen';
import DogProfileScreen from './src/screens/onboarding/DogProfileScreen';
import HomeScreen from './src/screens/HomeScreen';
import LibraryScreen from './src/screens/library/LibraryScreen';
import ScanDetailScreen from './src/screens/library/ScanDetailScreen';
import CartographyScreen from './src/screens/cartography/CartographyScreen';
import ProfileScreen from './src/screens/profile/ProfileScreen';
import WebScanPlaceholderScreen from './src/screens/scan/WebScanPlaceholderScreen';

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

// ── Bottom Tab Navigator ───────────────────────────────────
function MainTabs() {
  const { colors } = useContext(ThemeContext);
  const ScanScreenComponent = Platform.OS === 'web'
    ? WebScanPlaceholderScreen
    : require('./src/screens/scan/ScanFlowScreen').default;

  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: colors.bg,
          borderTopColor: colors.bd,
          borderTopWidth: 1,
          paddingBottom: 8,
          paddingTop: 4,
          height: 56,
        },
        tabBarActiveTintColor: colors.p,
        tabBarInactiveTintColor: colors.td,
        tabBarLabelStyle: { fontSize: 10, fontWeight: '600' },
      }}
    >
      <Tab.Screen name="Home" component={HomeScreen}
        options={{ tabBarLabel: 'Accueil', tabBarIcon: ({ color }) => <Text style={{ fontSize: 20, color }}>🏠</Text> }} />
      <Tab.Screen name="Library" component={LibraryScreen}
        options={{ tabBarLabel: 'Biblio', tabBarIcon: ({ color }) => <Text style={{ fontSize: 20, color }}>📚</Text> }} />
      <Tab.Screen name="Scan" component={ScanScreenComponent}
        options={{ tabBarLabel: 'Scanner', tabBarIcon: ({ color }) => <Text style={{ fontSize: 24, color }}>🎙️</Text> }} />
      <Tab.Screen name="Cartography" component={CartographyScreen}
        options={{ tabBarLabel: 'Carto', tabBarIcon: ({ color }) => <Text style={{ fontSize: 20, color }}>🗺️</Text> }} />
      <Tab.Screen name="Profile" component={ProfileScreen}
        options={{ tabBarLabel: 'Profil', tabBarIcon: ({ color }) => <Text style={{ fontSize: 20, color }}>👤</Text> }} />
    </Tab.Navigator>
  );
}

// ── Main App ───────────────────────────────────────────────
export default function App() {
  const [themeName, setThemeName] = useState('dark');
  const [loading, setLoading] = useState(true);
  const [session, setSession] = useState(null);
  const [profile, setProfile] = useState(null);
  const [dogs, setDogs] = useState([]);
  const [activeDogIndex, setActiveDogIndex] = useState(0);
  const [hasOnboarded, setHasOnboarded] = useState(false);

  const colors = themeName === 'dark' ? DARK : LIGHT;
  const dogsRef = useRef(dogs);
  const hasOnboardedRef = useRef(hasOnboarded);
  const activeDogIndexRef = useRef(activeDogIndex);

  useEffect(() => { dogsRef.current = dogs; }, [dogs]);
  useEffect(() => { hasOnboardedRef.current = hasOnboarded; }, [hasOnboarded]);
  useEffect(() => { activeDogIndexRef.current = activeDogIndex; }, [activeDogIndex]);

  const applyDogsState = useCallback((nextDogs, source = 'unknown') => {
    const safeDogs = Array.isArray(nextDogs) ? nextDogs : [];
    const currentDogs = dogsRef.current || [];
    const currentActiveDogIndex = activeDogIndexRef.current || 0;
    const beforeActiveDog = currentDogs[currentActiveDogIndex] || null;
    const nextHasOnboarded = safeDogs.length > 0;
    const nextActiveDogIndex = safeDogs.length ? Math.min(currentActiveDogIndex, safeDogs.length - 1) : 0;
    const nextActiveDog = safeDogs[nextActiveDogIndex] || null;

    console.log('[App] hasOnboarded.before', { source, value: hasOnboardedRef.current, dogCount: currentDogs.length });
    console.log('[App] activeDog.before', { source, index: currentActiveDogIndex, dogId: beforeActiveDog?.id || null });

    dogsRef.current = safeDogs;
    activeDogIndexRef.current = nextActiveDogIndex;
    hasOnboardedRef.current = nextHasOnboarded;

    setDogs(safeDogs);
    setActiveDogIndex(nextActiveDogIndex);
    setHasOnboarded(nextHasOnboarded);

    console.log('[App] hasOnboarded.after', { source, value: nextHasOnboarded, dogCount: safeDogs.length });
    console.log('[App] activeDog.after', { source, index: nextActiveDogIndex, dogId: nextActiveDog?.id || null });
  }, []);

  // ── Auth state listener ──────────────────────────────────
  useEffect(() => {
    // Vérifier la session au démarrage
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (session) loadUserData(session.user.id);
      else setLoading(false);
    });

    // Écouter les changements d'auth
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_event, session) => {
        setSession(session);
        if (session) await loadUserData(session.user.id);
        else {
          setProfile(null);
          applyDogsState([], 'auth.signOut');
          setLoading(false);
        }
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  // ── Charger les données user ─────────────────────────────
  const loadUserData = async (userId) => {
    try {
      console.log('[App] loadUserData.start', { userId });
      const prof = await profileService.get();
      console.log('[App] loadUserData.profile.success', { userId, profileId: prof?.id || null });
      setProfile(prof);

      const { dogService } = require('./src/services/database');
      const userDogs = await dogService.getAll();
      console.log('[App] loadUserData.dogs.success', { userId, dogCount: userDogs.length });
      applyDogsState(userDogs, 'loadUserData');

      // Update streak
      await profileService.updateStreak();
      console.log('[App] loadUserData.updateStreak.success', { userId });
    } catch (error) {
      console.error('Error loading user data', {
        userId,
        message: error?.message || 'unknown_error',
        code: error?.code || null,
        details: error?.details || null,
        hint: error?.hint || null,
      });
    } finally {
      setLoading(false);
    }
  };

  const refreshProfile = useCallback(async () => {
    if (session) await loadUserData(session.user.id);
  }, [session]);

  // ── Loading screen ───────────────────────────────────────
  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.bg }}>
        <Text style={{ fontSize: 48, marginBottom: 16 }}>🐕</Text>
        <Text style={{ fontSize: 32, fontWeight: '900', color: colors.p, letterSpacing: 6 }}>WOUF</Text>
        <ActivityIndicator color={colors.p} size={32} style={{ marginTop: 24 }} />
      </View>
    );
  }

  return (
    <ThemeContext.Provider value={{ theme: themeName, colors, toggle: () => setThemeName(t => t === 'dark' ? 'light' : 'dark') }}>
      <AuthContext.Provider value={{ user: session?.user, profile, refresh: refreshProfile, session }}>
        <DogsContext.Provider value={{
          dogs,
          activeDog: dogs[activeDogIndex] || null,
          activeDogIndex,
          setActiveDog: setActiveDogIndex,
          refreshDogs: async () => {
            const { dogService } = require('./src/services/database');
            const d = await dogService.getAll();
            applyDogsState(d, 'refreshDogs');
          },
        }}>
          <StatusBar style={themeName === 'dark' ? 'light' : 'dark'} />
          <NavigationContainer>
            <Stack.Navigator screenOptions={{ headerShown: false }}>
              {!session ? (
                // ── NON CONNECTÉ ──
                <>
                  <Stack.Screen name="Onboarding" component={OnboardingScreen} />
                  <Stack.Screen name="Auth" component={AuthScreen} />
                </>
              ) : !hasOnboarded ? (
                // ── CONNECTÉ MAIS PAS DE CHIEN ──
                <Stack.Screen name="DogProfile" component={DogProfileScreen} />
              ) : (
                // ── CONNECTÉ + CHIEN CRÉÉ ──
                <>
                  <Stack.Screen name="MainTabs" component={MainTabs} />
                  <Stack.Screen name="ScanDetail" component={ScanDetailScreen} />
                  <Stack.Screen
                    name="AddDog"
                    component={DogProfileScreen}
                    options={{ presentation: 'modal', animation: 'slide_from_bottom' }}
                  />
                </>
              )}
            </Stack.Navigator>
          </NavigationContainer>
        </DogsContext.Provider>
      </AuthContext.Provider>
    </ThemeContext.Provider>
  );
}
