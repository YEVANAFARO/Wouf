/**
 * WOUF — Dog Profile Creation Screen
 * ════════════════════════════════════
 * FEATURE #3 (MUST HAVE): Onboarding + Création profil chien
 * 
 * 9 étapes: Photo/Nom → Identité → Race → Gabarit → Personnalité → Déclencheurs → Environnement → Santé/Préfs → Résumé
 * TODO: Implémenter chaque étape avec les composants du proto V6
 */
import React, { useState, useContext, useRef } from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView, Image, Alert } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { ThemeContext, DogsContext } from '../../context/appContexts';
import { dogService, profileService } from '../../services/database';
import { BREEDS, PERSONALITIES, TRIGGERS, HEALTH_SIGNS, PHYSICAL_SPECS, ACTIVITIES, SIZES } from '../../config/constants';
import { getUserFacingError } from '../../services/userFacingErrors';

const STEPS = ['photo', 'identity', 'breed', 'size', 'personality', 'triggers', 'environment', 'health', 'summary'];
const SAVE_TIMEOUT_MS = 15000;

function withTimeout(promise, ms, label) {
  return Promise.race([
    promise,
    new Promise((_, reject) => setTimeout(() => reject(new Error(`${label}_timeout`)), ms)),
  ]);
}

export default function DogProfileScreen({ navigation, route }) {
  const { colors } = useContext(ThemeContext);
  const { refreshDogs } = useContext(DogsContext);
  const [step, setStep] = useState(0);
  const [saving, setSaving] = useState(false);
  const [dog, setDog] = useState({
    name: '', photo: null, sex: null, neutered: null,
    bdMode: null, bdExact: '', bdYear: '', bdMonth: null, bdReminder: true,
    breedMode: null, breed: '', mixBreeds: [],
    size: null, physSpec: [],
    personality: [], triggers: [],
    housing: null, garden: null, alone: null, otherAnimals: null, noise: null,
    healthSigns: [], favTreats: '', favToys: '', favActivities: [],
  });

  const u = (k, v) => setDog(p => ({ ...p, [k]: v }));
  const tg = (k, v) => setDog(p => ({
    ...p, [k]: p[k].includes(v) ? p[k].filter(x => x !== v) : [...p[k], v]
  }));

  const pickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true, aspect: [1, 1], quality: 0.7,
    });
    if (!result.canceled) u('photo', result.assets[0].uri);
  };

  const takePhoto = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') { Alert.alert('Permission requise', 'Active l’accès caméra si tu veux prendre une photo maintenant.'); return; }
    const result = await ImagePicker.launchCameraAsync({
      allowsEditing: true, aspect: [1, 1], quality: 0.7,
    });
    if (!result.canceled) u('photo', result.assets[0].uri);
  };

  const saveDog = async () => {
    if (!dog.name.trim()) {
      Alert.alert('Nom requis', 'Ajoute au moins le nom de ton chien pour continuer.');
      return;
    }

    setSaving(true);
    try {
      console.log('[DogProfile] dog.create.start', { name: dog.name.trim(), hasPhoto: Boolean(dog.photo) });
      const created = await withTimeout(dogService.create({
        ...dog,
        name: dog.name.trim(),
        favTreats: dog.favTreats.trim(),
        favToys: dog.favToys.trim(),
      }), SAVE_TIMEOUT_MS, 'dog_create');

      console.log('[DogProfile] dog.create.success', { dogId: created?.id });

      let photoNotice = null;
      if (dog.photo) {
        try {
          await withTimeout(dogService.uploadPhoto(created.id, dog.photo), SAVE_TIMEOUT_MS, 'dog_photo_upload');
        } catch (photoError) {
          console.warn('[DogProfile] photo upload skipped', photoError?.message || 'unknown_error');
          photoNotice = 'Le profil est créé, mais la photo sera à réessayer plus tard.';
        }
      }

      let profileNotice = null;
      try {
        await withTimeout(profileService.addXp(200), SAVE_TIMEOUT_MS, 'dog_reward');
      } catch (profileError) {
        console.warn('[DogProfile] profile reward skipped', {
          message: profileError?.message || 'unknown_error',
          code: profileError?.code || null,
          details: profileError?.details || null,
          hint: profileError?.hint || null,
        });
        profileNotice = 'Le profil du chien est créé, mais la mise à jour du profil sera réessayée plus tard.';
      }

      console.log('[DogProfile] dog.refresh.start');
      try {
        await withTimeout(refreshDogs(), SAVE_TIMEOUT_MS, 'dog_refresh');
        console.log('[DogProfile] dog.refresh.success');
      } catch (refreshError) {
        console.warn('[DogProfile] dog.refresh.skipped', refreshError?.message || 'unknown_error');
      }
      console.log('[DogProfile] navigation.afterDogRefresh', {
        routeName: route?.name || null,
        canGoBack: navigation.canGoBack(),
      });

      if (route?.name === 'AddDog' && navigation.canGoBack()) {
        navigation.goBack();
        return;
      }

      if (photoNotice || profileNotice) {
        Alert.alert('Profil créé', [photoNotice, profileNotice].filter(Boolean).join('\n\n'));
      }
      // Navigation automatique via App.js (hasOnboarded = true)
    } catch (error) {
      console.error('[DogProfile] dog.create.failure', {
        message: error?.message || 'unknown_error',
        code: error?.code || null,
        details: error?.details || null,
        hint: error?.hint || null,
      });
      Alert.alert('Erreur', getUserFacingError(error, 'Impossible de créer le profil chien pour le moment.'));
    } finally {
      setSaving(false);
    }
  };

  // ── Chip Component ─────────────────────────────────────
  const Chip = ({ label, active, onPress }) => (
    <TouchableOpacity onPress={onPress} style={{
      paddingHorizontal: 12, paddingVertical: 7, borderRadius: 16, marginRight: 5, marginBottom: 5,
      backgroundColor: active ? colors.pG : colors.bg2,
      borderWidth: active ? 2 : 1, borderColor: active ? colors.p + '50' : colors.bd,
    }}>
      <Text style={{ fontSize: 12, color: active ? colors.p : colors.tx, fontWeight: active ? '700' : '400' }}>{label}</Text>
    </TouchableOpacity>
  );

  const inputStyle = {
    width: '100%', padding: 14, borderRadius: 10, borderWidth: 2,
    borderColor: colors.bd, backgroundColor: colors.bg2, color: colors.tx, fontSize: 14,
  };

  // ── Step Content ───────────────────────────────────────
  const renderStep = () => {
    switch (STEPS[step]) {
      case 'photo':
        return (<View>
          <Text style={{ fontSize: 18, fontWeight: '800', color: colors.tx, marginBottom: 4 }}>📸 Photo et nom</Text>
          <Text style={{ color: colors.ts, fontSize: 12, marginBottom: 12 }}>La photo personnalise tout le dashboard.</Text>
          <TouchableOpacity onPress={() => Alert.alert('Photo', 'Choisis une option', [
            { text: 'Galerie', onPress: pickImage },
            { text: 'Caméra', onPress: takePhoto },
            { text: 'Annuler', style: 'cancel' },
          ])} style={{
            width: 120, height: 120, borderRadius: 60, backgroundColor: colors.bg3,
            borderWidth: 2, borderStyle: 'dashed', borderColor: colors.p + '40',
            alignSelf: 'center', marginBottom: 10, justifyContent: 'center', alignItems: 'center', overflow: 'hidden',
          }}>
            {dog.photo ? <Image source={{ uri: dog.photo }} style={{ width: 120, height: 120 }} />
              : <><Text style={{ fontSize: 36 }}>📷</Text><Text style={{ fontSize: 9, color: colors.p }}>Galerie ou caméra</Text></>}
          </TouchableOpacity>
          <Text style={{ fontSize: 11, fontWeight: '600', color: colors.ts, marginBottom: 4 }}>Nom du chien *</Text>
          <TextInput value={dog.name} onChangeText={v => u('name', v)} placeholder="Ex : Rex, Luna, Pixel…"
            placeholderTextColor={colors.td} style={inputStyle} autoFocus />
        </View>);

      case 'identity':
        return (<View>
          <Text style={{ fontSize: 18, fontWeight: '800', color: colors.tx, marginBottom: 8 }}>Identité de {dog.name}</Text>
          <Text style={{ fontSize: 11, fontWeight: '600', color: colors.ts, marginBottom: 4 }}>Sexe *</Text>
          <View style={{ flexDirection: 'row', gap: 6, marginBottom: 12 }}>
            {['Mâle', 'Femelle'].map(s => (
              <TouchableOpacity key={s} onPress={() => u('sex', s)} style={{
                flex: 1, padding: 14, borderRadius: 10, alignItems: 'center',
                backgroundColor: dog.sex === s ? colors.pG : colors.bg2,
                borderWidth: dog.sex === s ? 2 : 1, borderColor: dog.sex === s ? colors.p + '50' : colors.bd,
              }}>
                <Text style={{ fontSize: 20 }}>{s === 'Mâle' ? '♂' : '♀'}</Text>
                <Text style={{ color: dog.sex === s ? colors.p : colors.tx, fontWeight: dog.sex === s ? '700' : '400' }}>{s}</Text>
              </TouchableOpacity>
            ))}
          </View>
          <Text style={{ fontSize: 11, fontWeight: '600', color: colors.ts, marginBottom: 4 }}>Stérilisé(e) ?</Text>
          <View style={{ flexDirection: 'row', gap: 6, marginBottom: 12 }}>
            {['Oui', 'Non', 'Je ne sais pas'].map(v => (
              <TouchableOpacity key={v} onPress={() => u('neutered', v)} style={{
                flex: 1, padding: 10, borderRadius: 10, alignItems: 'center',
                backgroundColor: dog.neutered === v ? colors.pG : colors.bg2,
                borderWidth: dog.neutered === v ? 2 : 1, borderColor: dog.neutered === v ? colors.p + '50' : colors.bd,
              }}>
                <Text style={{ fontSize: 11, color: dog.neutered === v ? colors.p : colors.tx, fontWeight: dog.neutered === v ? '700' : '400' }}>{v}</Text>
              </TouchableOpacity>
            ))}
          </View>
          {/* TODO: Ajouter date de naissance (exact/approx/inconnu) + toggle rappel anniversaire */}
        </View>);

      case 'breed':
        return (<View>
          <Text style={{ fontSize: 18, fontWeight: '800', color: colors.tx, marginBottom: 8 }}>Race de {dog.name}</Text>
          <View style={{ flexDirection: 'row', gap: 6, marginBottom: 8 }}>
            {[['Race connue', 'pure'], ['Croisé', 'mixed'], ['Inconnu', 'unknown']].map(([l, v]) => (
              <TouchableOpacity key={v} onPress={() => u('breedMode', v)} style={{
                flex: 1, padding: 10, borderRadius: 10, alignItems: 'center',
                backgroundColor: dog.breedMode === v ? colors.pG : colors.bg2,
                borderWidth: dog.breedMode === v ? 2 : 1, borderColor: dog.breedMode === v ? colors.p + '50' : colors.bd,
              }}>
                <Text style={{ fontSize: 12, color: dog.breedMode === v ? colors.p : colors.tx, fontWeight: dog.breedMode === v ? '700' : '400' }}>{l}</Text>
              </TouchableOpacity>
            ))}
          </View>
          {dog.breedMode === 'pure' && (
            <ScrollView style={{ maxHeight: 250 }}>
              {BREEDS.map(b => (
                <TouchableOpacity key={b} onPress={() => u('breed', b)} style={{
                  padding: 10, borderRadius: 8, marginBottom: 2,
                  backgroundColor: dog.breed === b ? colors.pG : 'transparent',
                  borderWidth: 1, borderColor: dog.breed === b ? colors.p + '40' : colors.bd,
                }}>
                  <Text style={{ fontSize: 12, color: dog.breed === b ? colors.p : colors.tx, fontWeight: dog.breed === b ? '700' : '400' }}>{b}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          )}
          {dog.breedMode === 'mixed' && (
            <View>
              <Text style={{ fontSize: 11, color: colors.ts, marginBottom: 6 }}>Sélectionne les races du croisement :</Text>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
                {BREEDS.slice(0, 30).map(b => <Chip key={b} label={b} active={dog.mixBreeds.includes(b)} onPress={() => tg('mixBreeds', b)} />)}
              </View>
            </View>
          )}
        </View>);

      case 'size':
        return (<View>
          <Text style={{ fontSize: 18, fontWeight: '800', color: colors.tx, marginBottom: 4 }}>Gabarit de {dog.name}</Text>
          <Text style={{ color: colors.ts, fontSize: 12, marginBottom: 12 }}>Pas besoin du poids exact.</Text>
          {SIZES.map(s => <Chip key={s} label={s} active={dog.size === s} onPress={() => u('size', s)} />)}
          <Text style={{ fontSize: 11, fontWeight: '600', color: colors.ts, marginTop: 16, marginBottom: 4 }}>Spécificités physiques</Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
            {PHYSICAL_SPECS.map(s => <Chip key={s} label={s} active={dog.physSpec.includes(s)} onPress={() => tg('physSpec', s)} />)}
          </View>
        </View>);

      case 'personality':
        return (<View>
          <Text style={{ fontSize: 18, fontWeight: '800', color: colors.tx, marginBottom: 4 }}>Personnalité de {dog.name}</Text>
          <Text style={{ color: colors.ts, fontSize: 12, marginBottom: 12 }}>Sélectionne tout ce qui correspond.</Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
            {PERSONALITIES.map(p => <Chip key={p} label={p} active={dog.personality.includes(p)} onPress={() => tg('personality', p)} />)}
          </View>
        </View>);

      case 'triggers':
        return (<View>
          <Text style={{ fontSize: 18, fontWeight: '800', color: colors.tx, marginBottom: 4 }}>Qu'est-ce qui fait réagir {dog.name} ?</Text>
          <Text style={{ color: colors.ts, fontSize: 12, marginBottom: 12 }}>Situations qui provoquent aboiements ou stress.</Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
            {TRIGGERS.map(t => <Chip key={t} label={t} active={dog.triggers.includes(t)} onPress={() => tg('triggers', t)} />)}
          </View>
        </View>);

      case 'environment':
        return (<View>
          <Text style={{ fontSize: 18, fontWeight: '800', color: colors.tx, marginBottom: 8 }}>Environnement</Text>
          <Text style={{ fontSize: 11, fontWeight: '600', color: colors.ts, marginBottom: 4 }}>Logement</Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', marginBottom: 10 }}>
            {['Maison', 'Appartement'].map(v => <Chip key={v} label={v} active={dog.housing === v} onPress={() => u('housing', v)} />)}
          </View>
          <Text style={{ fontSize: 11, fontWeight: '600', color: colors.ts, marginBottom: 4 }}>Accès extérieur</Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', marginBottom: 10 }}>
            {['Grand jardin', 'Petit jardin', 'Balcon / Terrasse', 'Aucun'].map(v => <Chip key={v} label={v} active={dog.garden === v} onPress={() => u('garden', v)} />)}
          </View>
          <Text style={{ fontSize: 11, fontWeight: '600', color: colors.ts, marginBottom: 4 }}>Temps seul par jour</Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', marginBottom: 10 }}>
            {['Jamais seul', 'Moins de 2h', '2 à 4h', '4 à 8h', 'Plus de 8h'].map(v => <Chip key={v} label={v} active={dog.alone === v} onPress={() => u('alone', v)} />)}
          </View>
          <Text style={{ fontSize: 11, fontWeight: '600', color: colors.ts, marginBottom: 4 }}>Autres animaux</Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
            {['Aucun', 'Autre(s) chien(s)', 'Chat(s)', 'NAC', 'Plusieurs'].map(v => <Chip key={v} label={v} active={dog.otherAnimals === v} onPress={() => u('otherAnimals', v)} />)}
          </View>
        </View>);

      case 'health':
        return (<View>
          <Text style={{ fontSize: 18, fontWeight: '800', color: colors.tx, marginBottom: 8 }}>Santé & Préférences</Text>
          <Text style={{ fontSize: 11, fontWeight: '600', color: colors.ts, marginBottom: 4 }}>Signes de santé récents</Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', marginBottom: 10 }}>
            {HEALTH_SIGNS.map(s => <Chip key={s} label={s} active={dog.healthSigns.includes(s)} onPress={() => tg('healthSigns', s)} />)}
          </View>
          <Text style={{ fontSize: 11, fontWeight: '600', color: colors.ts, marginBottom: 4 }}>Friandises préférées</Text>
          <TextInput value={dog.favTreats} onChangeText={v => u('favTreats', v)} placeholder="Poulet, fromage…"
            placeholderTextColor={colors.td} style={{ ...inputStyle, marginBottom: 10 }} />
          <Text style={{ fontSize: 11, fontWeight: '600', color: colors.ts, marginBottom: 4 }}>Jouets préférés</Text>
          <TextInput value={dog.favToys} onChangeText={v => u('favToys', v)} placeholder="Balle, corde…"
            placeholderTextColor={colors.td} style={{ ...inputStyle, marginBottom: 10 }} />
          <Text style={{ fontSize: 11, fontWeight: '600', color: colors.ts, marginBottom: 4 }}>Activités favorites</Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
            {ACTIVITIES.map(a => <Chip key={a} label={a} active={dog.favActivities.includes(a)} onPress={() => tg('favActivities', a)} />)}
          </View>
        </View>);

      case 'summary':
        const fields = [dog.name, dog.sex, dog.breedMode, dog.size, dog.personality.length > 0, dog.triggers.length > 0, dog.housing, dog.alone, dog.healthSigns.length > 0, dog.favActivities.length > 0];
        const pct = Math.round(fields.filter(Boolean).length / fields.length * 100);
        return (<View style={{ alignItems: 'center' }}>
          <Text style={{ fontSize: 56 }}>🎉</Text>
          <Text style={{ fontSize: 18, fontWeight: '800', color: colors.tx, textAlign: 'center', marginTop: 10 }}>Dossier de {dog.name} prêt !</Text>
          <View style={{ width: '100%', backgroundColor: colors.bg2, borderRadius: 14, padding: 14, marginTop: 14, borderWidth: 1, borderColor: colors.bd }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 5 }}>
              <Text style={{ color: colors.ts, fontSize: 11 }}>Complétude</Text>
              <Text style={{ color: colors.g, fontSize: 12, fontWeight: '700' }}>{pct}%</Text>
            </View>
            <View style={{ height: 7, backgroundColor: colors.bd, borderRadius: 4 }}>
              <View style={{ width: pct + '%', height: '100%', backgroundColor: colors.g, borderRadius: 4 }} />
            </View>
          </View>
          <View style={{ flexDirection: 'row', gap: 6, marginTop: 10 }}>
            {[['🏅', '+200', 'XP'], ['📋', pct + '%', 'Dossier'], ['🧠', 'Prêt', 'IA']].map(([i, v, l], j) => (
              <View key={j} style={{ flex: 1, backgroundColor: colors.bg3, borderRadius: 10, padding: 10, alignItems: 'center', borderWidth: 1, borderColor: colors.bd }}>
                <Text style={{ fontSize: 18 }}>{i}</Text>
                <Text style={{ fontSize: 14, fontWeight: '800', color: colors.p }}>{v}</Text>
                <Text style={{ fontSize: 9, color: colors.td }}>{l}</Text>
              </View>
            ))}
          </View>
        </View>);
    }
  };

  const isLast = step === STEPS.length - 1;
  const canContinue = step === 0 ? dog.name.trim().length > 0 : true;

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      {/* Progress bar */}
      <View style={{ padding: 16, paddingBottom: 0 }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 }}>
          {step > 0 ? (
            <TouchableOpacity onPress={() => setStep(s => Math.max(0, s - 1))}>
              <Text style={{ color: colors.p, fontWeight: '600' }}>← Retour</Text>
            </TouchableOpacity>
          ) : <View />}
          <Text style={{ fontSize: 10, fontWeight: '700', color: colors.p, letterSpacing: 2 }}>DOSSIER</Text>
          {navigation.canGoBack() ? (
            <TouchableOpacity onPress={() => navigation.goBack()}>
              <Text style={{ color: colors.ts, fontWeight: '700' }}>✕</Text>
            </TouchableOpacity>
          ) : <View />}
        </View>
        <View style={{ height: 4, backgroundColor: colors.bd, borderRadius: 2 }}>
          <View style={{ width: ((step + 1) / STEPS.length * 100) + '%', height: '100%', backgroundColor: colors.p, borderRadius: 2 }} />
        </View>
      </View>

      {/* Content */}
      <ScrollView style={{ flex: 1, padding: 20 }} keyboardShouldPersistTaps="handled">
        {renderStep()}
        <View style={{ height: 100 }} />
      </ScrollView>

      {/* CTA */}
      <View style={{ padding: 20 }}>
        <TouchableOpacity
          onPress={isLast ? saveDog : () => setStep(s => s + 1)}
          disabled={!canContinue || saving}
          style={{
            backgroundColor: colors.p, borderRadius: 12, paddingVertical: 14, alignItems: 'center',
            opacity: canContinue && !saving ? 1 : 0.4,
          }}>
          <Text style={{ color: colors.bg, fontSize: 14, fontWeight: '700' }}>
            {saving ? 'Enregistrement...' : isLast ? '🚀 Lancer WOUF' : 'Continuer'}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}
