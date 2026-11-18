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
4. Nyní se můžete přihlásit v aplikaci na adrese /#/admin/login.

## 4. Konfigurace Supabase Storage a Edge Function

    Storage: Spuštěním skriptu 02_rls_and_storage.sql se automaticky vytvořil veřejný bucket broadcast-media s limitem 10 MB na soubor a bezpečnostními RLS politikami. Ověřte v Storage → Buckets, že je bucket broadcast-media přítomen.

    Edge Function pro zakládání novinářů z webového rozhraní:

        Nainstalujte Supabase CLI (npm install -g supabase) a přihlaste se (supabase login).

        Propojte projekt (supabase link --project-ref ID_PROJEKTU) a nasaďte funkci:
        Bash

        supabase functions deploy manage-users --no-verify-jwt

        (Poznámka: Ověření JWT a role administrátora provádí samotný kód funkce manage-users/index.ts.)

## 5. Nasazení na GitHub Pages

    Nahrajte zdrojový kód do repozitáře na GitHubu (větev main).

    V repozitáři otevřete Settings → Secrets and variables → Actions → New repository secret a přidejte:

        VITE_SUPABASE_URL – URL vašeho Supabase projektu

        VITE_SUPABASE_ANON_KEY – veřejný anon klíč ze Supabase

        VITE_PUBLIC_SITE_URL – cílová URL vašeho webu (např. https://ucet.github.io/prenosy)

    Přejděte do Settings → Pages a v sekci Build and deployment → Source vyberte GitHub Actions.

    Po každém pushi do větve main se spustí workflow .github/workflows/deploy.yml, které aplikaci sestaví a publikuje.

## 6. Provozní příručky
Vytvoření prvního živého přenosu

    Přihlaste se na /#/admin.

    Klikněte na tlačítko Nový přenos.

    Vyplňte název události (URL identifikátor se vygeneruje automaticky), datum konání, úvodní informaci pro čtenáře a zvolte stav Aktivní (Živě).

    Po uložení klikněte u přenosu na Vstoupit do redakce přenosu.

Přidání účtu novináře

    Jako administrátor otevřete /#/admin a přepněte se na záložku Správa novinářů.

    Vyplňte jméno, e-mail, počáteční heslo (min. 8 znaků), zvolte roli Novinář a klikněte na Vytvořit účet.

    Účet je ihned aktivní. V přehledu členů redakce lze kdykoliv účet deaktivovat nebo odeslat odkaz pro změnu hesla.

Vložení přenosu do jiného webu (Embed)

    V redakčním dashboardu nebo přímo v redakčním studiu klikněte na tlačítko Embed kód.

    Nastavte požadovanou výšku (výchozí 800 px) a zkopírujte vygenerovaný kód <iframe>.

    Vložte kód do HTML bloku cílového webu (WordPress blok „Vlastní HTML“, Joomla, Drupal nebo statická stránka). Přenos se v rámu aktualizuje živě bez redakčních prvků.
