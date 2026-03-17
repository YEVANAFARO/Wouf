import React, { useContext } from 'react';
import { View, Text, ScrollView, TouchableOpacity } from 'react-native';
import { ThemeContext } from '../../../App';
export default function ScanDetailScreen({ route, navigation }) {
  const { colors } = useContext(ThemeContext);
  const { scan } = route.params;
  const h = scan.hypotheses?.[scan.validated_hypothesis||0];
  return (<ScrollView style={{ flex:1, backgroundColor:colors.bg, padding:16 }}>
    <TouchableOpacity onPress={()=>navigation.goBack()}><Text style={{color:colors.p,fontWeight:'600',marginBottom:10}}>← Retour</Text></TouchableOpacity>
    <View style={{backgroundColor:colors.bg2,borderRadius:14,padding:14,borderWidth:1,borderColor:colors.bd}}>
      <Text style={{fontSize:18,fontWeight:'800',color:colors.p}}>{h?.emoji} {scan.correction?scan.correction_emotion:h?.category}</Text>
      <Text style={{fontSize:14,fontWeight:'800',color:colors.tx,marginTop:4}}>{h?.confidence}% confiance</Text>
      {h?.explanation&&<Text style={{fontSize:12,color:colors.ts,lineHeight:20,marginTop:8}}>{h.explanation}</Text>}
      {h?.actions?.map((a,i)=><Text key={i} style={{fontSize:11,color:colors.tx,marginTop:2}}>• {a}</Text>)}
      {scan.correction&&<View style={{marginTop:8,padding:8,backgroundColor:colors.aG,borderRadius:8}}><Text style={{fontSize:10,color:colors.a}}>✏️ {scan.correction_text} → {scan.correction_emotion}</Text></View>}
    </View>
  </ScrollView>);
}
