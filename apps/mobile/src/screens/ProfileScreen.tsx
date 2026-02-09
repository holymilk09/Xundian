import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { useAuthStore } from '../stores/useAuthStore';
import { useSyncStore } from '../stores/useSyncStore';
import { performSync } from '../services/sync';
import { GradientButton } from '../components/GradientButton';
import { Colors, FontSize, BorderRadius, Spacing } from '../theme';

export function ProfileScreen() {
  const { t, i18n } = useTranslation();
  const employee = useAuthStore((s) => s.employee);
  const language = useAuthStore((s) => s.language);
  const setLanguage = useAuthStore((s) => s.setLanguage);
  const logout = useAuthStore((s) => s.logout);

  const lastSyncAt = useSyncStore((s) => s.lastSyncAt);
  const isSyncing = useSyncStore((s) => s.isSyncing);
  const pendingChanges = useSyncStore((s) => s.pendingChanges);
  const syncError = useSyncStore((s) => s.syncError);

  const toggleLang = () => {
    setLanguage(language === 'en' ? 'zh' : 'en');
  };

  const lastSyncDisplay = lastSyncAt
    ? new Date(lastSyncAt).toLocaleTimeString(
        i18n.language === 'zh' ? 'zh-CN' : 'en-US',
        { hour: '2-digit', minute: '2-digit' },
      )
    : '\u2014';

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>{t('profile')}</Text>
      </View>

      <ScrollView contentContainerStyle={styles.scroll}>
        {/* User Info */}
        <View style={styles.userCard}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>
              {employee?.name?.charAt(0) ?? '?'}
            </Text>
          </View>
          <View>
            <Text style={styles.userName}>{employee?.name ?? ''}</Text>
            <Text style={styles.userPhone}>{employee?.phone ?? ''}</Text>
            <Text style={styles.userRole}>
              {employee?.role ?? ''} {'\u00B7'} {employee?.company_name ?? ''}
            </Text>
          </View>
        </View>

        {/* Language Toggle */}
        <View style={styles.settingRow}>
          <Text style={styles.settingLabel}>{t('lang')}</Text>
          <TouchableOpacity style={styles.langButton} onPress={toggleLang}>
            <Text style={styles.langButtonText}>{t('switchLang')}</Text>
          </TouchableOpacity>
        </View>

        {/* Sync Status */}
        <View style={styles.syncCard}>
          <Text style={styles.syncTitle}>{t('syncStatus')}</Text>
          <View style={styles.syncRow}>
            <Text style={styles.syncLabel}>{t('lastSync')}</Text>
            <Text style={styles.syncValue}>{lastSyncDisplay}</Text>
          </View>
          <View style={styles.syncRow}>
            <Text style={styles.syncLabel}>{t('pendingChanges')}</Text>
            <Text style={styles.syncValue}>{pendingChanges}</Text>
          </View>
          {syncError && (
            <Text style={styles.syncError}>{syncError}</Text>
          )}
          <GradientButton
            title={isSyncing ? t('syncing') : t('syncNow')}
            onPress={performSync}
            disabled={isSyncing}
            style={styles.syncButton}
          />
        </View>

        {/* App Info */}
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>{t('version')}</Text>
          <Text style={styles.infoValue}>0.1.0</Text>
        </View>

        {/* Logout */}
        <TouchableOpacity style={styles.logoutButton} onPress={logout}>
          <Text style={styles.logoutText}>{t('logout')}</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  header: {
    paddingHorizontal: Spacing.lg,
    paddingTop: 56,
    paddingBottom: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.05)',
  },
  title: {
    color: Colors.textPrimary,
    fontSize: FontSize.xl,
    fontWeight: '700',
  },
  scroll: {
    padding: Spacing.lg,
    paddingBottom: 100,
  },
  userCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.lg,
    padding: Spacing.xl,
    borderRadius: BorderRadius.xl,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.surfaceBorder,
    marginBottom: Spacing.xl,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 14,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    color: '#FFFFFF',
    fontSize: FontSize.xl,
    fontWeight: '700',
  },
  userName: {
    color: Colors.textPrimary,
    fontSize: FontSize.lg,
    fontWeight: '700',
  },
  userPhone: {
    color: Colors.textSecondary,
    fontSize: FontSize.md - 1,
    marginTop: 2,
  },
  userRole: {
    color: Colors.textMuted,
    fontSize: FontSize.sm,
    marginTop: 2,
  },
  settingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: Spacing.lg,
    paddingHorizontal: Spacing.lg,
    borderRadius: BorderRadius.lg,
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
    marginBottom: Spacing.md,
  },
  settingLabel: {
    color: Colors.textPrimary,
    fontSize: FontSize.md,
    fontWeight: '500',
  },
  langButton: {
    paddingVertical: 6,
    paddingHorizontal: 14,
    borderRadius: BorderRadius.md,
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  langButtonText: {
    color: Colors.textSecondary,
    fontSize: FontSize.sm,
    fontWeight: '500',
  },
  syncCard: {
    padding: Spacing.lg,
    borderRadius: BorderRadius.lg,
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
    marginBottom: Spacing.xl,
  },
  syncTitle: {
    color: Colors.textPrimary,
    fontSize: FontSize.md,
    fontWeight: '600',
    marginBottom: Spacing.md,
  },
  syncRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: Spacing.sm,
  },
  syncLabel: {
    color: Colors.textSecondary,
    fontSize: FontSize.md - 1,
  },
  syncValue: {
    color: Colors.textPrimary,
    fontSize: FontSize.md - 1,
    fontWeight: '600',
  },
  syncError: {
    color: Colors.danger,
    fontSize: FontSize.sm,
    marginVertical: Spacing.sm,
  },
  syncButton: {
    marginTop: Spacing.md,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: Spacing.lg,
    paddingHorizontal: Spacing.lg,
    borderRadius: BorderRadius.lg,
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
    marginBottom: Spacing.xl,
  },
  infoLabel: {
    color: Colors.textSecondary,
    fontSize: FontSize.md - 1,
  },
  infoValue: {
    color: Colors.textMuted,
    fontSize: FontSize.md - 1,
  },
  logoutButton: {
    paddingVertical: 14,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    borderColor: 'rgba(239,68,68,0.3)',
    backgroundColor: 'rgba(239,68,68,0.08)',
    alignItems: 'center',
  },
  logoutText: {
    color: '#F87171',
    fontSize: FontSize.md,
    fontWeight: '600',
  },
});
