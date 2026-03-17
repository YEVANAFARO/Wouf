import React, { useState, useEffect, useContext } from 'react';
import { View, Text, TouchableOpacity, ScrollView, RefreshControl } from 'react-native';
import { ThemeContext, DogsContext } from '../../../App';
import { scanService } from '../../services/database';
export default function LibraryScreen({ navigation }) {
  const { colors } = useContext(ThemeContext);
  const { activeDog } = useContext(DogsContext);
  const [scans, setScans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const load = async () => { if (!activeDog) return; setLoading(true); try { setScans(await scanService.getForDog(activeDog.id)); } catch(e){} finally { setLoading(false); } };
  useEffect(() => { load(); }, [activeDog?.id]);
  const cats = {}; scans.forEach(s => { const e = s.correction ? s.correction_emotion : s.hypotheses?.[0]?.category || '?'; cats[e] = (cats[e]||0)+1; });
  const items = filter === 'all' ? scans : scans.filter(s => (s.correction ? s.correction_emotion : s.hypotheses?.[0]?.category) === filter);
  return (<ScrollView style={{ flex: 1, backgroundColor: colors.bg, padding: 16 }} refreshControl={<RefreshControl refreshing={loading} onRefresh={load} tintColor={colors.p}/>}>
    <Text style={{ fontSize: 20, fontWeight: '800', color: colors.tx, marginBottom: 10 }}>📚 {activeDog?.name}</Text>
    <ScrollView horizontal style={{ marginBottom: 10 }}>
      {[['all','Tout'],...Object.entries(cats)].map(([k,v]) => <TouchableOpacity key={k} onPress={()=>setFilter(k)} style={{ paddingHorizontal:10,paddingVertical:5,borderRadius:14,marginRight:5,backgroundColor:filter===k?colors.pG:colors.bg2,borderWidth:1,borderColor:filter===k?colors.p+'50':colors.bd}}><Text style={{fontSize:11,color:filter===k?colors.p:colors.tx}}>{k==='all'?'Tout':k+' ('+v+')'}</Text></TouchableOpacity>)}
    </ScrollView>
    {items.map(s => <TouchableOpacity key={s.id} onPress={()=>navigation.navigate('ScanDetail',{scan:s})} style={{ backgroundColor:colors.bg2,borderRadius:10,padding:10,marginBottom:5,borderWidth:1,borderColor:colors.bd,borderLeftWidth:3,borderLeftColor:s.validated?colors.p:colors.a}}>
      <View style={{flexDirection:'row',justifyContent:'space-between'}}><Text style={{fontSize:12,fontWeight:'700',color:s.validated?colors.p:colors.a}}>{s.hypotheses?.[0]?.emoji} {s.correction?s.correction_emotion:s.hypotheses?.[0]?.category}</Text><Text style={{fontSize:9,color:colors.td}}>{new Date(s.scanned_at).toLocaleDateString('fr-FR')}</Text></View>
    </TouchableOpacity>)}
    {items.length===0&&<View style={{alignItems:'center',padding:30}}><Text style={{fontSize:40}}>📚</Text><Text style={{color:colors.td}}>Scanne pour remplir !</Text></View>}
    <View style={{height:80}}/>
  </ScrollView>);
}
