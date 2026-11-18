# Živý textový přenos a redakční systém

Produkční webová aplikace pro provoz živých textových přenosů z konferencí, jednání a veřejných událostí. Postaveno pro statický hosting **GitHub Pages** a cloudový backend **Supabase** (PostgreSQL, Auth, Realtime, Storage).

---

## 1. Založení projektu v Supabase

1. Přihlaste se na [supabase.com](https://supabase.com) a klikněte na **New Project**.
2. Zvolte název projektu, silné databázové heslo a nejbližší evropský region (např. **Frankfurt – eu-central-1**).
3. Po vytvoření projektu přejděte do **Project Settings → API** a poznamenejte si:
   - **Project URL** (`VITE_SUPABASE_URL`)
   - **anon / public** klíč (`VITE_SUPABASE_ANON_KEY`)
4. V levém menu otevřete **SQL Editor** a postupně spusťte:
   - kompletní obsah souboru `supabase/01_schema.sql`
   - kompletní obsah souboru `supabase/02_rls_and_storage.sql`

---

## 2. Nastavení autentizace (Supabase Auth)

1. V administraci Supabase přejděte do **Authentication → Providers → Email**.
2. Zapněte **Enable Email provider**.
3. Přejděte do **Authentication → Settings** (nebo **Sign In / Up**) a **vypněte volbu „Allow new users to sign up“** (veřejná registrace nesmí být povolena).
4. V sekci **Authentication → URL Configuration** nastavte:
   - **Site URL**: `https://VASE-UZIVATELSKE-JMENO.github.io/NAZEV-REPOZITARE`
   - **Redirect URLs**: přidejte `https://VASE-UZIVATELSKE-JMENO.github.io/NAZEV-REPOZITARE/**` (nutné pro funkční obnovu hesla).

---

## 3. Bezpečné vytvoření prvního administrátorského účtu

Z bezpečnostních důvodů neobsahuje zdrojový kód žádné výchozí heslo. Prvního administrátora založte takto:

1. V administraci Supabase otevřete **Authentication → Users → Add user → Create new user**.
2. Zadejte e-mail administrátora, zvolte silné heslo a ponechte zaškrtnuté **Auto Confirm User**.
3. Otevřete **SQL Editor** a povyšte nově založený účet na administrátora (nahraďte e-mail svým):
   ```sql
   UPDATE public.profiles
   SET role = 'admin', full_name = 'Hlavní administrátor'
   WHERE email = 'admin@vase-domena.cz';
