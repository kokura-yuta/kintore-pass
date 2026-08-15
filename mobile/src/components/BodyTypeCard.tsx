import { Image } from 'expo-image';
import { Pressable, StyleSheet, Text, View } from 'react-native';

type Props = {
  description: string;
  image: number;
  isSelected: boolean;
  name: string;
  onPress: () => void;
};

export function BodyTypeCard({ description, image, isSelected, name, onPress }: Props) {
  return (
    <Pressable
      accessibilityRole="radio"
      accessibilityState={{ checked: isSelected }}
      onPress={onPress}
      style={({ pressed }) => [
        styles.card,
        isSelected && styles.selectedCard,
        pressed && styles.pressedCard,
      ]}
    >
      <Image alt={`${name}の見本`} contentFit="cover" source={image} style={styles.image} transition={180} />
      {isSelected ? (
        <View style={styles.checkBadge}>
          <Text style={styles.check}>✓</Text>
        </View>
      ) : null}
      <View style={styles.textArea}>
        <Text style={[styles.name, isSelected && styles.selectedText]}>{name}</Text>
        <Text style={[styles.description, isSelected && styles.selectedDescription]}>
          {description}
        </Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    width: '48.4%',
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#303030',
    borderRadius: 16,
    backgroundColor: '#151515',
  },
  selectedCard: { borderColor: '#F6D365', backgroundColor: '#F6D365' },
  pressedCard: { opacity: 0.82 },
  image: { width: '100%', aspectRatio: 0.78, backgroundColor: '#202420' },
  textArea: { minHeight: 104, padding: 12 },
  name: { color: '#F4F6F3', fontSize: 15, fontWeight: '700' },
  description: { marginTop: 5, color: '#969F98', fontSize: 11, lineHeight: 17 },
  selectedText: { color: '#0A0A0A' },
  selectedDescription: { color: '#3A3A3A' },
  checkBadge: {
    position: 'absolute',
    top: 9,
    right: 9,
    width: 28,
    height: 28,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 14,
    backgroundColor: '#0A0A0A',
  },
  check: { color: '#FFF1B8', fontSize: 15, fontWeight: '700' },
});
