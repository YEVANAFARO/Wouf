import React, { useContext } from 'react';
import { View, Text, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { ThemeContext, AuthContext, DogsContext } from '../../../App';
import { auth } from '../../config/supabase';
import { dataService } from '../../services/database';
import { REFERRAL_TIERS, resolveReferralTier } from '../../services/monetization';
import { getUserFacingError } from '../../services/userFacingErrors';

export default function ProfileScreen({ navigation }) {
  const { colors, theme, toggle } = useContext(ThemeContext);
  const { profile } = useContext(AuthContext);
  const { activeDog } = useContext(DogsContext);
  const referralCount = profile?.referral_count || 0;
  const referralTier = resolveReferralTier(referralCount);

  const Row = ({ icon, label, sub, onPress, danger }) => (
    <TouchableOpacity onPress={onPress} style={{ flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: colors.bg2, borderRadius: 10, padding: 10, marginBottom: 4, borderWidth: 1, borderColor: colors.bd }}>
      <View style={{ width: 30, height: 30, borderRadius: 7, backgroundColor: colors.bg3, justifyContent: 'center', alignItems: 'center' }}><Text style={{ fontSize: 14 }}>{icon}</Text></View>
      <View style={{ flex: 1 }}><Text style={{ fontSize: 12, fontWeight: '600', color: danger ? colors.a : colors.tx }}>{label}</Text>{sub && <Text style={{ fontSize: 9, color: colors.td }}>{sub}</Text>}</View>
      <Text style={{ color: colors.td }}>›</Text>
    </TouchableOpacity>
  );

  const handleDeleteData = () => {
    Alert.alert('⚠️', 'Cette suppression est irréversible.', [
      { text: 'Non' },
      {
        text: 'Oui',
        style: 'destructive',
        onPress: async () => {
          try {
            await dataService.deleteAllUserData();
          } catch (error) {
            Alert.alert('Suppression impossible', getUserFacingError(error, 'Impossible de supprimer les données pour le moment.'));
          }
        },
      },
    ]);
  };

  const handleSignOut = () => {
    Alert.alert('Déconnexion', 'Veux-tu vraiment te déconnecter ?', [
      { text: 'Non' },
      {
        text: 'Oui',
        onPress: async () => {
          try {
            await auth.signOut();
          } catch (error) {
            Alert.alert('Déconnexion impossible', getUserFacingError(error, 'Impossible de te déconnecter pour le moment.'));
          }
        },
      },
    ]);
  };

  return (
    <ScrollView style={{ flex: 1, backgroundColor: colors.bg, padding: 16 }}>
      <Text style={{ fontSize: 20, fontWeight: '800', color: colors.tx, marginBottom: 12 }}>Profil</Text>
      <View style={{ backgroundColor: colors.bg2, borderRadius: 14, padding: 14, marginBottom: 8, borderWidth: 1, borderColor: colors.bd, flexDirection: 'row', alignItems: 'center', gap: 10 }}>
        <View style={{ width: 48, height: 48, borderRadius: 24, backgroundColor: colors.pG, justifyContent: 'center', alignItems: 'center' }}><Text style={{ fontSize: 26 }}>🐕</Text></View>
        <View>
          <Text style={{ fontSize: 15, fontWeight: '800', color: colors.tx }}>{activeDog?.name || 'Aucun chien sélectionné'}</Text>
          <Text style={{ fontSize: 10, color: colors.ts }}>{activeDog?.breed || activeDog?.breed_mode || 'Profil chien à compléter'} · Niv.{profile?.level || 1}</Text>
        </View>
      </View>
      <Row icon="🔔" label="Notifications" onPress={() => {}} />
      <Row icon="💳" label="Plan" sub={(profile?.plan || 'free').toUpperCase()} onPress={() => {}} />
      <Row icon="🎁" label="Parrainage" sub={`${profile?.referral_code || 'N/A'} · ${referralCount} filleul(s)`} onPress={() => {}} />
      <View style={{ backgroundColor: colors.bg2, borderRadius: 10, padding: 10, marginBottom: 6, borderWidth: 1, borderColor: colors.bd }}>
        <Text style={{ fontSize: 11, fontWeight: '700', color: colors.tx }}>Statut fondateur: {profile?.founder_status || 'standard'}</Text>
        <Text style={{ fontSize: 10, color: colors.ts, marginTop: 4 }}>Palier actuel: {referralTier.label} · Priorité bêta: {profile?.beta_priority_score || 0}</Text>
        <Text style={{ fontSize: 9, color: colors.td, marginTop: 4 }}>Paliers: {REFERRAL_TIERS.map((tier) => `${tier.referrals}`).join(' / ')} referrals</Text>
      </View>
      <Row icon="🛡️" label="RGPD" onPress={() => {}} />
      <Row icon="❓" label="FAQ" onPress={() => {}} />
      <Row icon="🛍️" label="Shop (À venir)" sub="Teaser visible en bêta" onPress={() => Alert.alert('Shop WOUF', 'À venir pendant la bêta fermée.')} />
      <Row icon="📬" label="Contact" sub="< 48h" onPress={() => {}} />
      <Row icon="⭐" label="Laisser un avis" sub="+50🪙" onPress={() => Alert.alert('Merci !', 'Ton retour comptera beaucoup pendant la bêta fermée.')} />
      <Row icon="➕" label="Ajouter un chien" onPress={() => navigation.navigate('AddDog')} />
      <Row icon={theme === 'dark' ? '☀️' : '🌙'} label={theme === 'dark' ? 'Mode clair' : 'Mode sombre'} onPress={toggle} />
      <Row icon="🗑️" label="Supprimer données" danger onPress={handleDeleteData} />
      <Row icon="🚪" label="Déconnexion" onPress={handleSignOut} />
      <Text style={{ textAlign: 'center', fontSize: 9, color: colors.td, marginTop: 14 }}>WOUF v1.0 beta</Text>
      <View style={{ height: 80 }} />
    </ScrollView>
  );
}
