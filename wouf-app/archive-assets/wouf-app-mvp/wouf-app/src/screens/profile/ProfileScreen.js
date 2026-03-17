import React, { useContext } from 'react';
import { View, Text, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { ThemeContext, AuthContext, DogsContext } from '../../../App';
import { auth } from '../../config/supabase';
import { dataService } from '../../services/database';
export default function ProfileScreen({ navigation }) {
  const { colors, theme, toggle } = useContext(ThemeContext);
  const { profile } = useContext(AuthContext);
  const { activeDog } = useContext(DogsContext);
  const Row = ({icon,label,sub,onPress,danger}) => <TouchableOpacity onPress={onPress} style={{flexDirection:'row',alignItems:'center',gap:8,backgroundColor:colors.bg2,borderRadius:10,padding:10,marginBottom:4,borderWidth:1,borderColor:colors.bd}}>
    <View style={{width:30,height:30,borderRadius:7,backgroundColor:colors.bg3,justifyContent:'center',alignItems:'center'}}><Text style={{fontSize:14}}>{icon}</Text></View>
    <View style={{flex:1}}><Text style={{fontSize:12,fontWeight:'600',color:danger?colors.a:colors.tx}}>{label}</Text>{sub&&<Text style={{fontSize:9,color:colors.td}}>{sub}</Text>}</View>
    <Text style={{color:colors.td}}>›</Text>
  </TouchableOpacity>;
  return (<ScrollView style={{flex:1,backgroundColor:colors.bg,padding:16}}>
    <Text style={{fontSize:20,fontWeight:'800',color:colors.tx,marginBottom:12}}>Profil</Text>
    <View style={{backgroundColor:colors.bg2,borderRadius:14,padding:14,marginBottom:8,borderWidth:1,borderColor:colors.bd,flexDirection:'row',alignItems:'center',gap:10}}>
      <View style={{width:48,height:48,borderRadius:24,backgroundColor:colors.pG,justifyContent:'center',alignItems:'center'}}><Text style={{fontSize:26}}>🐕</Text></View>
      <View><Text style={{fontSize:15,fontWeight:'800',color:colors.tx}}>{activeDog?.name}</Text><Text style={{fontSize:10,color:colors.ts}}>{activeDog?.breed||activeDog?.breed_mode} · Niv.{profile?.level||1}</Text></View>
    </View>
    <Row icon="🔔" label="Notifications" onPress={()=>{}}/>
    <Row icon="🎁" label="Parrainage" sub={profile?.referral_code} onPress={()=>{}}/>
    <Row icon="🛡️" label="RGPD" onPress={()=>{}}/>
    <Row icon="❓" label="FAQ" onPress={()=>{}}/>
    <Row icon="📬" label="Contact" sub="< 48h" onPress={()=>{}}/>
    <Row icon="⭐" label="Laisser un avis" sub="+50🪙" onPress={()=>Alert.alert('Merci!')}/>
    <Row icon="➕" label="Ajouter un chien" onPress={()=>navigation.navigate('AddDog')}/>
    <Row icon={theme==='dark'?'☀️':'🌙'} label={theme==='dark'?'Mode clair':'Mode sombre'} onPress={toggle}/>
    <Row icon="🗑️" label="Supprimer données" danger onPress={()=>Alert.alert('⚠️','Irréversible',[{text:'Non'},{text:'Oui',style:'destructive',onPress:()=>dataService.deleteAllUserData()}])}/>
    <Row icon="🚪" label="Déconnexion" onPress={()=>Alert.alert('Sûr(e)?','',[{text:'Non'},{text:'Oui',onPress:()=>auth.signOut()}])}/>
    <Text style={{textAlign:'center',fontSize:9,color:colors.td,marginTop:14}}>WOUF v1.0 beta</Text>
    <View style={{height:80}}/>
  </ScrollView>);
}
