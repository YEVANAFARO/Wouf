import React, { useState, useEffect, useContext } from 'react';
import { View, Text, ScrollView } from 'react-native';
import { ThemeContext, DogsContext } from '../../../App';
import { scanService } from '../../services/database';
export default function CartographyScreen() {
  const { colors } = useContext(ThemeContext);
  const { activeDog } = useContext(DogsContext);
  const [stats, setStats] = useState(null);
  useEffect(() => { if(activeDog) scanService.getStats(activeDog.id).then(setStats).catch(console.error); }, [activeDog?.id]);
  if(!stats) return <View style={{flex:1,backgroundColor:colors.bg,justifyContent:'center',alignItems:'center'}}><Text style={{color:colors.ts}}>Chargement...</Text></View>;
  const cols=[colors.p,colors.a,colors.g,colors.b,colors.pu]; const maxH=Math.max(...stats.hours,1);
  return (<ScrollView style={{flex:1,backgroundColor:colors.bg,padding:16}}>
    <Text style={{fontSize:20,fontWeight:'800',color:colors.tx,marginBottom:10}}>🗺️ {activeDog?.name}</Text>
    {stats.validatedCount>=10&&stats.latestAdvice&&<View style={{backgroundColor:colors.pG,borderRadius:14,padding:14,marginBottom:10,borderWidth:2,borderColor:colors.p+'40'}}><Text style={{fontSize:11,fontWeight:'700',color:colors.p}}>🎯 Conseil IA</Text><Text style={{fontSize:12,color:colors.tx,lineHeight:20}}>{stats.latestAdvice}</Text></View>}
    <View style={{backgroundColor:colors.bg2,borderRadius:14,padding:14,marginBottom:10,borderWidth:1,borderColor:colors.bd}}>
      <Text style={{fontSize:13,fontWeight:'700',color:colors.tx,marginBottom:8}}>Émotions</Text>
      {stats.emotions.map(([e,c],i)=><View key={e} style={{marginBottom:6}}><View style={{flexDirection:'row',justifyContent:'space-between'}}><Text style={{fontSize:11,color:colors.tx}}>{e}</Text><Text style={{fontSize:11,fontWeight:'700',color:cols[i%cols.length]}}>{Math.round(c/stats.total*100)}%</Text></View><View style={{height:5,backgroundColor:colors.bd,borderRadius:3}}><View style={{width:Math.round(c/stats.total*100)+'%',height:'100%',borderRadius:3,backgroundColor:cols[i%cols.length]}}/></View></View>)}
    </View>
    <View style={{backgroundColor:colors.bg2,borderRadius:14,padding:14,marginBottom:10,borderWidth:1,borderColor:colors.bd}}>
      <Text style={{fontSize:13,fontWeight:'700',color:colors.tx,marginBottom:8}}>⏰ Horaires</Text>
      <View style={{flexDirection:'row',alignItems:'flex-end',height:50}}>{stats.hours.map((c,i)=><View key={i} style={{flex:1,alignItems:'center'}}><View style={{width:'80%',height:Math.max(c/maxH*50,2),backgroundColor:c>0?colors.b:colors.b+'15',borderRadius:1}}/>{i%6===0&&<Text style={{fontSize:7,color:colors.td}}>{i}h</Text>}</View>)}</View>
    </View>
    {stats.latestNote&&<View style={{backgroundColor:colors.bG,borderRadius:10,padding:9,marginBottom:7}}><Text style={{fontSize:10,color:colors.tx}}>{stats.latestNote}</Text></View>}
    <View style={{height:80}}/>
  </ScrollView>);
}
