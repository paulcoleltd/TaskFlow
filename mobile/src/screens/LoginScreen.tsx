import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  KeyboardAvoidingView, Platform, ActivityIndicator, ScrollView,
} from 'react-native';
import { useAuthStore } from '../store/authStore';
import { Colors, Spacing, Radii, FontSizes, FontWeights } from '../constants/theme';

const DEMO_ACCOUNTS = [
  { label: 'Admin',  email: 'alex@taskflow.io',   password: 'Admin1234!',  color: Colors.blue   },
  { label: 'Member', email: 'sarah@taskflow.io',  password: 'Member1234!', color: Colors.violet },
  { label: 'Viewer', email: 'marcus@taskflow.io', password: 'Viewer1234!', color: Colors.emerald },
] as const;

export function LoginScreen() {
  const [email,    setEmail]    = useState('');
  const [password, setPassword] = useState('');
  const { login, isLoading, error, clearError } = useAuthStore();

  const handleLogin = async () => {
    if (!email.trim() || !password) return;
    clearError();
    await login(email.trim(), password);
  };

  const fillDemo = (acc: typeof DEMO_ACCOUNTS[number]) => {
    clearError();
    setEmail(acc.email);
    setPassword(acc.password);
  };

  return (
    <KeyboardAvoidingView
      style={styles.root}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        {/* Logo */}
        <View style={styles.logoWrap}>
          <View style={styles.logoIcon}>
            <Text style={styles.logoEmoji}>⚡</Text>
          </View>
          <Text style={styles.logoText}>TaskFlow</Text>
          <Text style={styles.logoSub}>Sign in to your workspace</Text>
        </View>

        {/* Form */}
        <View style={styles.form}>
          <View style={styles.field}>
            <Text style={styles.label}>Email</Text>
            <TextInput
              style={styles.input}
              value={email}
              onChangeText={setEmail}
              placeholder="you@example.com"
              placeholderTextColor={Colors.textFaint}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
              returnKeyType="next"
            />
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>Password</Text>
            <TextInput
              style={styles.input}
              value={password}
              onChangeText={setPassword}
              placeholder="••••••••"
              placeholderTextColor={Colors.textFaint}
              secureTextEntry
              returnKeyType="done"
              onSubmitEditing={handleLogin}
            />
          </View>

          {error ? <Text style={styles.error}>{error}</Text> : null}

          <TouchableOpacity
            style={[styles.btn, isLoading && styles.btnDisabled]}
            onPress={handleLogin}
            disabled={isLoading}
            accessibilityLabel="Sign in"
          >
            {isLoading
              ? <ActivityIndicator color={Colors.white} />
              : <Text style={styles.btnText}>Sign in</Text>
            }
          </TouchableOpacity>
        </View>

        {/* Demo accounts */}
        <View style={styles.demoSection}>
          <Text style={styles.demoTitle}>Demo accounts</Text>
          <View style={styles.demoGrid}>
            {DEMO_ACCOUNTS.map(acc => (
              <TouchableOpacity
                key={acc.email}
                style={[styles.demoBtn, { borderColor: `${acc.color}60` }]}
                onPress={() => fillDemo(acc)}
                accessibilityLabel={`Sign in as ${acc.label}`}
              >
                <View style={[styles.demoDot, { backgroundColor: acc.color }]} />
                <View>
                  <Text style={[styles.demoLabel, { color: acc.color }]}>{acc.label}</Text>
                  <Text style={styles.demoEmail}>{acc.email}</Text>
                </View>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root:   { flex: 1, backgroundColor: Colors.bg },
  scroll: { flexGrow: 1, padding: Spacing.xxl, justifyContent: 'center', gap: Spacing['3xl'] },

  logoWrap:  { alignItems: 'center', gap: Spacing.md },
  logoIcon:  { width: 64, height: 64, borderRadius: Radii.xl, backgroundColor: `${Colors.blue}20`, alignItems: 'center', justifyContent: 'center' },
  logoEmoji: { fontSize: 30 },
  logoText:  { fontSize: FontSizes['3xl'], fontWeight: FontWeights.extrabold, color: Colors.textPrimary },
  logoSub:   { fontSize: FontSizes.base, color: Colors.textMuted },

  form:   { gap: Spacing.lg },
  field:  { gap: Spacing.xs },
  label:  { fontSize: FontSizes.sm, fontWeight: FontWeights.semibold, color: Colors.textMuted },
  input:  {
    backgroundColor: Colors.input,
    borderWidth:     1,
    borderColor:     Colors.border,
    borderRadius:    Radii.md,
    paddingHorizontal: Spacing.lg,
    paddingVertical:   Spacing.md,
    fontSize:        FontSizes.base,
    color:           Colors.textPrimary,
  },
  error:   { fontSize: FontSizes.sm, color: Colors.red, textAlign: 'center' },

  btn:        { backgroundColor: Colors.blue, borderRadius: Radii.md, paddingVertical: Spacing.lg, alignItems: 'center' },
  btnDisabled:{ opacity: 0.6 },
  btnText:    { fontSize: FontSizes.md, fontWeight: FontWeights.bold, color: Colors.white },

  demoSection: { gap: Spacing.md },
  demoTitle:   { fontSize: FontSizes.sm, fontWeight: FontWeights.semibold, color: Colors.textFaint, textAlign: 'center' },
  demoGrid:    { gap: Spacing.sm },
  demoBtn:     {
    flexDirection: 'row', alignItems: 'center', gap: Spacing.md,
    backgroundColor: Colors.card, borderWidth: 1, borderRadius: Radii.md,
    padding: Spacing.md,
  },
  demoDot:   { width: 10, height: 10, borderRadius: Radii.full },
  demoLabel: { fontSize: FontSizes.sm, fontWeight: FontWeights.semibold },
  demoEmail: { fontSize: FontSizes.xs, color: Colors.textFaint },
});
