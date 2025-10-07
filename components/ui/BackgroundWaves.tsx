import Svg, { Path, Defs, LinearGradient, Stop } from "react-native-svg";
import { View, StyleSheet } from "react-native";

export default function BackgroundWaves() {
  return (
    <View style={styles.container}>
      <Svg height={220} width="100%" viewBox="0 0 1440 320">
        <Defs>
          <LinearGradient id="waveGradient" x1="0" y1="0" x2="1" y2="1">
            <Stop offset="0%" stopColor="#0F172A" stopOpacity="1" />
            <Stop offset="50%" stopColor="#1E3A8A" stopOpacity="0.9" />
            <Stop offset="100%" stopColor="#3B82F6" stopOpacity="0.9" />
          </LinearGradient>
        </Defs>

        {/* Top wave */}
        <Path
          fill="url(#waveGradient)"
          d="M0,128L60,133.3C120,139,240,149,360,170.7C480,192,600,224,720,229.3C840,235,960,213,1080,181.3C1200,149,1320,107,1380,85.3L1440,64V0H0Z"
        />

        {/* Middle wave */}
        <Path
          fill="url(#waveGradient)"
          opacity="0.6"
          d="M0,192L80,197.3C160,203,320,213,480,208C640,203,800,181,960,165.3C1120,149,1280,139,1360,133.3L1440,128V0H0Z"
        />

        {/* Bottom wave */}
        <Path
          fill="url(#waveGradient)"
          opacity="0.3"
          d="M0,256L60,229.3C120,203,240,149,360,128C480,107,600,117,720,144C840,171,960,213,1080,224C1200,235,1320,213,1380,202.7L1440,192V0H0Z"
        />
      </Svg>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
  },
});
