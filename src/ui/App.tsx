import { useEffect } from 'react';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { requestPersistentStorage } from '../persistence/repo';
import { useDataStore } from '../store/dataStore';
import { useUiStore, type Page } from '../store/uiStore';
import { BackupButtons } from './BackupButtons';
import { CollectionPage } from './collection/CollectionPage';
import { RoomPage } from './room/RoomPage';
import { SearchBox } from './SearchBox';

const TABS: { page: Page; label: string }[] = [
  { page: 'room', label: 'Ruang 3D' },
  { page: 'collection', label: 'Koleksi' },
];

export function App() {
  const loaded = useDataStore((s) => s.loaded);
  const hydrate = useDataStore((s) => s.hydrate);
  const page = useUiStore((s) => s.page);
  const setPage = useUiStore((s) => s.setPage);
  const error = useDataStore((s) => s.error);
  const clearError = useDataStore((s) => s.clearError);

  useEffect(() => {
    if (!useDataStore.getState().loaded) void hydrate();
    void requestPersistentStorage();
  }, [hydrate]);

  if (!loaded) {
    return error ? (
      <p role="alert" className="loading error">
        {error}
      </p>
    ) : (
      <p className="loading">Memuat…</p>
    );
  }

  return (
    <div className="app">
      <header className="topbar">
        <h1>OwnShelfBook</h1>
        <Tabs value={page} onValueChange={(v) => setPage(v as Page)} className="self-stretch">
          <TabsList variant="line" aria-label="Halaman" className="h-full! gap-4 p-0">
            {TABS.map((t) => (
              <TabsTrigger key={t.page} value={t.page} className="flex-none px-1 after:bottom-0! data-active:after:bg-primary">
                {t.label}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
        <div className="topbar-search">
          <SearchBox />
        </div>
        <BackupButtons />
      </header>
      <main className={`page page-${page}`}>{page === 'room' ? <RoomPage /> : <CollectionPage />}</main>
      {error && (
        <p role="alert" className="toast error" title="Klik untuk menutup" onClick={clearError}>
          {error}
        </p>
      )}
    </div>
  );
}
