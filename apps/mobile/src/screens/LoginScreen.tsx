import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { useAuthStore } from '../stores/useAuthStore';
import { GradientButton } from '../components/GradientButton';
import { Colors, FontSize, BorderRadius, Spacing } from '../theme';

export function LoginScreen() {
  const { t } = useTranslation();
  const { login, setLanguage, language } = useAuthStore();

  const [companyCode, setCompanyCode] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const toggleLang = () => {
    setLanguage(language === 'en' ? 'zh' : 'en');
  };

  const handleLogin = async () => {
    if (!companyCode || !phone || !password) return;
    setIsLoading(true);
    try {
      await login(companyCode, phone, password);
    } catch {
      Alert.alert(
        t('login'),
        language === 'en' ? 'Invalid credentials' : '登录信息错误',
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      {/* Language toggle */}
      <TouchableOpacity style={styles.langButton} onPress={toggleLang}>
        <Text style={styles.langText}>{t('switchLang')}</Text>
      </TouchableOpacity>

      <View style={styles.card}>
        {/* Logo */}
        <View style={styles.logoContainer}>
          <View style={styles.logoIcon}>
            <Text style={styles.logoChar}>{'\u5DE1'}</Text>
          </View>
          <Text style={styles.appName}>{t('appName')}</Text>
          <Text style={styles.tagline}>{t('tagline')}</Text>
        </View>

        {/* Form */}
        <View style={styles.form}>
          <TextInput
            style={styles.input}
            placeholder={t('company')}
            placeholderTextColor={Colors.textDim}
            value={companyCode}
            onChangeText={setCompanyCode}
            autoCapitalize="characters"
          />
          <TextInput
            style={styles.input}
            placeholder={t('email')}
            placeholderTextColor={Colors.textDim}
            value={phone}
            onChangeText={setPhone}
            keyboardType="phone-pad"
            autoCapitalize="none"
          />
          <TextInput
            style={styles.input}
            placeholder={t('password')}
            placeholderTextColor={Colors.textDim}
            value={password}
            onChangeText={setPassword}
            secureTextEntry
          />
        </View>

        <TouchableOpacity style={styles.forgotRow}>
          <Text style={styles.forgotText}>{t('forgotPassword')}</Text>
        </TouchableOpacity>

        <GradientButton
          title={t('repLogin')}
          onPress={handleLogin}
          disabled={isLoading}
          style={styles.loginButton}
        />
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: Spacing.xxl,
  },
  langButton: {
    position: 'absolute',
    top: 56,
    right: Spacing.xxl,
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderWidth: 1,
    borderColor: Colors.surfaceBorderStrong,
    paddingVertical: 6,
    paddingHorizontal: Spacing.lg,
    borderRadius: BorderRadius.md,
  },
  langText: {
    color: Colors.textSecondary,
    fontSize: FontSize.md - 1,
    fontWeight: '500',
  },
  card: {
    width: '100%',
    maxWidth: 380,
    padding: Spacing.xxxxl,
    paddingHorizontal: 36,
    borderRadius: BorderRadius.xxl,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  logoContainer: {
    alignItems: 'center',
    marginBottom: 40,
  },
  logoIcon: {
    width: 64,
    height: 64,
    borderRadius: BorderRadius.xl,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.lg,
  },
  logoChar: {
    fontSize: 28,
    color: '#FFFFFF',
  },
  appName: {
    color: Colors.textPrimary,
    fontSize: FontSize.xxxl,
    fontWeight: '700',
    letterSpacing: -0.5,
  },
  tagline: {
    color: Colors.textMuted,
    fontSize: FontSize.md,
    fontWeight: '400',
    marginTop: 6,
  },
  form: {
    gap: 14,
  },
  input: {
    paddingVertical: 14,
    paddingHorizontal: Spacing.lg,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    backgroundColor: 'rgba(255,255,255,0.05)',
    color: Colors.textPrimary,
    fontSize: FontSize.md + 1,
  },
  forgotRow: {
    marginTop: Spacing.md,
    marginBottom: Spacing.xxl,
  },
  forgotText: {
    color: Colors.primary,
    fontSize: FontSize.md - 1,
  },
  loginButton: {
    width: '100%',
  },
});
