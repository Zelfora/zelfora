import { useTranslation } from '../context/LanguageContext';

// The privacy statement, linked from the footer and from Google's sign-in
// screen (Google requires one before the app can be published). A legal text
// reads best as a whole, so each language has its own version here instead
// of keys in translations.js. Keep the three in step, and update UPDATED with
// every change.
const CONTROLLER = 'Jeffrey Kragten';
const EMAIL = 'info@zelfora.nl';
const UPDATED = '2026-11-08';

function Section({ title, children }) {
  return (
    <section className="flex flex-col gap-3">
      <h2 className="font-display text-lg font-semibold text-text">{title}</h2>
      {children}
    </section>
  );
}

function List({ children }) {
  return <ul className="flex list-disc flex-col gap-2 pl-5">{children}</ul>;
}

function Mail() {
  return (
    <a href={`mailto:${EMAIL}`} className="text-primary-300 hover:underline">
      {EMAIL}
    </a>
  );
}

function AP({ children }) {
  return (
    <a href="https://autoriteitpersoonsgegevens.nl" target="_blank" rel="noreferrer" className="text-primary-300 hover:underline">
      {children}
    </a>
  );
}

function PrivacyNl() {
  return (
    <>
      <p>
        Zelfora is een website waarop je eten bestelt bij restaurants. Hier lees je welke gegevens we daarvoor
        bewaren, waarom, met wie we ze delen en welke rechten je hebt.
      </p>

      <Section title="Wie is verantwoordelijk">
        <p>
          Zelfora wordt gerund door {CONTROLLER}. Heb je een vraag over je gegevens of over deze verklaring, mail dan
          naar <Mail />.
        </p>
      </Section>

      <Section title="Welke gegevens we bewaren">
        <List>
          <li>
            <strong className="text-text">Je account:</strong> je e-mailadres, je wachtwoord en, als je die toevoegt,
            een profielfoto. Je wachtwoord bewaren we niet zelf leesbaar: alleen een versleutelde afdruk ervan, waaruit
            het niet terug te halen is.
          </li>
          <li>
            <strong className="text-text">Inloggen met Google:</strong> Google geeft ons je naam, e-mailadres en
            profielfoto. We gebruiken die alleen voor je account bij Zelfora en delen ze met niemand. Google weet dan
            ook dat je Zelfora gebruikt.
          </li>
          <li>
            <strong className="text-text">Je bestellingen:</strong> je naam, telefoonnummer, bezorgadres, je eventuele
            opmerking, wat je bestelt, het bedrag en wanneer de bestelling geplaatst en bezorgd is.
          </li>
          <li>
            <strong className="text-text">Restaurants:</strong> wie een restaurant aanmeldt, geeft ons de gegevens van
            het restaurant: naam, adres, beschrijving, openingstijden, menu en foto's. Na goedkeuring zijn die voor
            iedereen te zien.
          </li>
          <li>
            <strong className="text-text">Beveiliging:</strong> zolang je ingelogd bent, wordt bij je inlogsessie je
            IP-adres en je browser bewaard. Onze leveranciers houden daarnaast een korte tijd (enkele dagen) logboeken
            bij van bezoeken, met IP-adressen, om storingen en misbruik op te sporen.
          </li>
        </List>
      </Section>

      <Section title="Waarom we ze gebruiken">
        <List>
          <li>Om je account te laten werken en je bestellingen te laten maken en bezorgen. Zonder deze gegevens kan dat niet.</li>
          <li>Om Zelfora veilig te houden en misbruik te voorkomen.</li>
        </List>
        <p>
          We verkopen je gegevens niet, tonen geen advertenties en sturen je geen reclame. We gebruiken geen
          analyse- of volgdiensten.
        </p>
      </Section>

      <Section title="Met wie we gegevens delen">
        <List>
          <li>
            <strong className="text-text">Het restaurant waar je bestelt</strong> ziet je naam, telefoonnummer,
            bezorgadres, opmerking en bestelling, om die te maken en te bezorgen. Opent het restaurant je adres in
            Google Maps, dan krijgt Google dat adres.
          </li>
          <li>
            <strong className="text-text">Supabase</strong> beheert onze database en het inloggen. Daar staan alle
            gegevens hierboven, op servers in Frankfurt (Duitsland).
          </li>
          <li>
            <strong className="text-text">Vercel</strong> host de website en ziet, zoals elke webserver, het IP-adres
            van elk bezoek.
          </li>
          <li>
            <strong className="text-text">PDOK</strong> (het Kadaster, de Nederlandse overheid) krijgt wat je in een
            adresveld typt, om adressen voor te stellen.
          </li>
          <li>
            <strong className="text-text">Google</strong>, alleen als je inlogt met Google.
          </li>
          <li>
            <strong className="text-text">Andere websites met foto's:</strong> sommige foto's op Zelfora komen van
            andere websites, bijvoorbeeld als een restaurant een link naar een foto plakt. Je browser haalt die daar
            zelf op, dus die website ziet je IP-adres.
          </li>
        </List>
        <p>
          Supabase en Vercel zijn Amerikaanse bedrijven, dus je gegevens kunnen ook buiten de Europese Unie worden
          verwerkt. Met Supabase gelden afspraken over de bescherming van je gegevens, met de
          standaardcontractbepalingen die de Europese Commissie daarvoor heeft goedgekeurd.
        </p>
      </Section>

      <Section title="Hoe lang we gegevens bewaren">
        <p>
          Je account en je bestellingen bewaren we zolang je account bestaat. Verwijderen we je account, dan
          verwijderen we ook je profiel en je bestellingen. Gegevens van je inlogsessie verdwijnen als je uitlogt.
        </p>
      </Section>

      <Section title="Wat je browser bewaart">
        <p>
          Zelfora gebruikt geen cookies. In je browser bewaren we alleen wat de website nodig heeft: dat je ingelogd
          bent, je gekozen taal en thema (licht of donker), en voor restaurants hoe hun bestellingen worden getoond. De
          lettertypen komen van Zelfora zelf.
        </p>
      </Section>

      <Section title="Je rechten">
        <p>
          Je mag de gegevens die we over je hebben inzien, laten verbeteren of laten verwijderen. Je mag ook vragen om
          ze minder te gebruiken, bezwaar maken, of ze krijgen in een bestand om aan een ander te geven. Mail daarvoor
          naar <Mail />, het liefst vanaf het e-mailadres van je account. Je krijgt binnen een maand antwoord.
        </p>
        <p>
          Wil je je account laten verwijderen, mail dan ook naar dat adres. Ben je het niet eens met hoe we met je
          gegevens omgaan, dan kun je een klacht indienen bij de <AP>Autoriteit Persoonsgegevens</AP>.
        </p>
      </Section>

      <Section title="Wijzigingen">
        <p>
          Passen we deze verklaring aan, dan staat de nieuwe datum bovenaan. Deze verklaring is ook vertaald in het
          Engels en Duits; bij verschillen geldt de Nederlandse tekst.
        </p>
      </Section>
    </>
  );
}

function PrivacyEn() {
  return (
    <>
      <p>
        Zelfora is a website for ordering food from restaurants. This page explains which data we keep for that, why,
        who we share it with and what your rights are.
      </p>

      <Section title="Who is responsible">
        <p>
          Zelfora is run by {CONTROLLER}. If you have a question about your data or about this statement, email{' '}
          <Mail />.
        </p>
      </Section>

      <Section title="What we keep">
        <List>
          <li>
            <strong className="text-text">Your account:</strong> your email address, your password and, if you add
            one, a profile photo. We don't keep your password in readable form, only an encrypted fingerprint of it
            that it can't be recovered from.
          </li>
          <li>
            <strong className="text-text">Signing in with Google:</strong> Google gives us your name, email address
            and profile photo. We use them only for your Zelfora account and share them with no one. Google also
            learns that you use Zelfora.
          </li>
          <li>
            <strong className="text-text">Your orders:</strong> your name, phone number, delivery address, any note
            you add, what you order, the amount, and when the order was placed and delivered.
          </li>
          <li>
            <strong className="text-text">Restaurants:</strong> whoever registers a restaurant gives us its details:
            name, address, description, opening hours, menu and photos. Once approved, these are public.
          </li>
          <li>
            <strong className="text-text">Security:</strong> while you are signed in, your session keeps your IP
            address and browser. Our providers also keep logs of visits, with IP addresses, for a short time (a few
            days), to find faults and abuse.
          </li>
        </List>
      </Section>

      <Section title="Why we use it">
        <List>
          <li>To run your account and to have your orders made and delivered. That isn't possible without this data.</li>
          <li>To keep Zelfora secure and prevent abuse.</li>
        </List>
        <p>
          We don't sell your data, show ads or send you marketing. We don't use analytics or tracking services.
        </p>
      </Section>

      <Section title="Who we share it with">
        <List>
          <li>
            <strong className="text-text">The restaurant you order from</strong> sees your name, phone number,
            delivery address, note and order, to make and deliver it. If the restaurant opens your address in Google
            Maps, Google receives that address.
          </li>
          <li>
            <strong className="text-text">Supabase</strong> runs our database and sign-in. All the data above is
            stored there, on servers in Frankfurt (Germany).
          </li>
          <li>
            <strong className="text-text">Vercel</strong> hosts the website and, like any web server, sees the IP
            address of every visit.
          </li>
          <li>
            <strong className="text-text">PDOK</strong> (the Dutch government's land registry, Kadaster) receives
            what you type in an address field, to suggest addresses.
          </li>
          <li>
            <strong className="text-text">Google</strong>, only if you sign in with Google.
          </li>
          <li>
            <strong className="text-text">Other websites with photos:</strong> some photos on Zelfora come from other
            websites, for example when a restaurant pastes a link to a photo. Your browser fetches them from there, so
            that website sees your IP address.
          </li>
        </List>
        <p>
          Supabase and Vercel are American companies, so your data may also be processed outside the European Union.
          Agreements on protecting your data apply with Supabase, using the standard contractual clauses the European
          Commission approved for this.
        </p>
      </Section>

      <Section title="How long we keep it">
        <p>
          We keep your account and orders for as long as your account exists. If we delete your account, we also
          delete your profile and your orders. Session details disappear when you sign out.
        </p>
      </Section>

      <Section title="What your browser keeps">
        <p>
          Zelfora doesn't use cookies. In your browser we keep only what the site needs: that you're signed in, your
          chosen language and theme (light or dark), and for restaurants how their orders are shown. The fonts come
          from Zelfora itself.
        </p>
      </Section>

      <Section title="Your rights">
        <p>
          You may see the data we hold about you, have it corrected or have it deleted. You may also ask us to use it
          less, object to its use, or receive it in a file to give to someone else. Email <Mail /> for this, ideally
          from your account's email address. You'll get an answer within a month.
        </p>
        <p>
          To have your account deleted, email that address too. If you disagree with how we handle your data, you
          can file a complaint with the Dutch Data Protection Authority, the <AP>Autoriteit Persoonsgegevens</AP>.
        </p>
      </Section>

      <Section title="Changes">
        <p>
          If we change this statement, the new date is shown at the top. This statement is a translation of the Dutch
          version; where they differ, the Dutch text applies.
        </p>
      </Section>
    </>
  );
}

function PrivacyDe() {
  return (
    <>
      <p>
        Zelfora ist eine Website, auf der du Essen bei Restaurants bestellst. Hier liest du, welche Daten wir dafür
        speichern, warum, mit wem wir sie teilen und welche Rechte du hast.
      </p>

      <Section title="Wer verantwortlich ist">
        <p>
          Zelfora wird von {CONTROLLER} betrieben. Hast du eine Frage zu deinen Daten oder zu dieser Erklärung, schreib
          an <Mail />.
        </p>
      </Section>

      <Section title="Welche Daten wir speichern">
        <List>
          <li>
            <strong className="text-text">Dein Konto:</strong> deine E-Mail-Adresse, dein Passwort und, wenn du eins
            hinzufügst, ein Profilfoto. Dein Passwort speichern wir nicht lesbar, sondern nur einen verschlüsselten
            Abdruck, aus dem es sich nicht zurückgewinnen lässt.
          </li>
          <li>
            <strong className="text-text">Anmelden mit Google:</strong> Google gibt uns deinen Namen, deine
            E-Mail-Adresse und dein Profilfoto. Wir nutzen sie nur für dein Konto bei Zelfora und geben sie an niemanden
            weiter. Google erfährt dabei auch, dass du Zelfora nutzt.
          </li>
          <li>
            <strong className="text-text">Deine Bestellungen:</strong> dein Name, deine Telefonnummer, deine
            Lieferadresse, eine eventuelle Anmerkung, was du bestellst, der Betrag und wann die Bestellung aufgegeben
            und geliefert wurde.
          </li>
          <li>
            <strong className="text-text">Restaurants:</strong> Wer ein Restaurant anmeldet, gibt uns dessen Daten:
            Name, Adresse, Beschreibung, Öffnungszeiten, Speisekarte und Fotos. Nach der Freigabe sind sie öffentlich.
          </li>
          <li>
            <strong className="text-text">Sicherheit:</strong> Solange du angemeldet bist, werden bei deiner Sitzung
            deine IP-Adresse und dein Browser gespeichert. Unsere Anbieter führen außerdem für kurze Zeit (einige
            Tage) Protokolle über Besuche, mit IP-Adressen, um Störungen und Missbrauch zu erkennen.
          </li>
        </List>
      </Section>

      <Section title="Wofür wir sie nutzen">
        <List>
          <li>
            Damit dein Konto funktioniert und deine Bestellungen zubereitet und geliefert werden können. Ohne diese
            Daten geht das nicht.
          </li>
          <li>Um Zelfora sicher zu halten und Missbrauch zu verhindern.</li>
        </List>
        <p>
          Wir verkaufen deine Daten nicht, zeigen keine Werbung und schicken dir keine Werbung. Wir nutzen keine
          Analyse- oder Tracking-Dienste.
        </p>
      </Section>

      <Section title="Mit wem wir Daten teilen">
        <List>
          <li>
            <strong className="text-text">Das Restaurant, bei dem du bestellst,</strong> sieht deinen Namen, deine
            Telefonnummer, Lieferadresse, Anmerkung und Bestellung, um sie zuzubereiten und zu liefern. Öffnet das
            Restaurant deine Adresse in Google Maps, erhält Google diese Adresse.
          </li>
          <li>
            <strong className="text-text">Supabase</strong> betreibt unsere Datenbank und die Anmeldung. Dort sind
            alle oben genannten Daten gespeichert, auf Servern in Frankfurt (Deutschland).
          </li>
          <li>
            <strong className="text-text">Vercel</strong> hostet die Website und sieht, wie jeder Webserver, die
            IP-Adresse jedes Besuchs.
          </li>
          <li>
            <strong className="text-text">PDOK</strong> (das Kadaster, die niederländische Behörde) erhält, was du in
            ein Adressfeld tippst, um Adressen vorzuschlagen.
          </li>
          <li>
            <strong className="text-text">Google</strong>, nur wenn du dich mit Google anmeldest.
          </li>
          <li>
            <strong className="text-text">Andere Websites mit Fotos:</strong> Manche Fotos auf Zelfora stammen von
            anderen Websites, zum Beispiel wenn ein Restaurant einen Link zu einem Foto einfügt. Dein Browser lädt sie
            von dort, also sieht diese Website deine IP-Adresse.
          </li>
        </List>
        <p>
          Supabase und Vercel sind amerikanische Unternehmen, deine Daten können also auch außerhalb der Europäischen
          Union verarbeitet werden. Mit Supabase gelten Vereinbarungen zum Schutz deiner Daten, mit den
          Standardvertragsklauseln, die die Europäische Kommission dafür genehmigt hat.
        </p>
      </Section>

      <Section title="Wie lange wir Daten speichern">
        <p>
          Dein Konto und deine Bestellungen speichern wir, solange dein Konto besteht. Löschen wir dein Konto, löschen
          wir auch dein Profil und deine Bestellungen. Die Daten deiner Sitzung verschwinden, wenn du dich abmeldest.
        </p>
      </Section>

      <Section title="Was dein Browser speichert">
        <p>
          Zelfora verwendet keine Cookies. In deinem Browser speichern wir nur, was die Website braucht: dass du
          angemeldet bist, deine gewählte Sprache und dein Design (hell oder dunkel) und für Restaurants, wie ihre
          Bestellungen angezeigt werden. Die Schriftarten kommen von Zelfora selbst.
        </p>
      </Section>

      <Section title="Deine Rechte">
        <p>
          Du darfst die Daten, die wir über dich haben, einsehen, berichtigen oder löschen lassen. Du kannst auch
          verlangen, dass wir sie eingeschränkt nutzen, der Nutzung widersprechen oder sie als Datei erhalten, um sie
          jemand anderem zu geben. Schreib dafür an <Mail />, am besten von der E-Mail-Adresse deines Kontos. Du
          bekommst innerhalb eines Monats eine Antwort.
        </p>
        <p>
          Möchtest du dein Konto löschen lassen, schreib ebenfalls an diese Adresse. Bist du nicht einverstanden damit,
          wie wir mit deinen Daten umgehen, kannst du dich bei der niederländischen Datenschutzbehörde, der{' '}
          <AP>Autoriteit Persoonsgegevens</AP>, beschweren.
        </p>
      </Section>

      <Section title="Änderungen">
        <p>
          Ändern wir diese Erklärung, steht das neue Datum oben. Diese Erklärung ist eine Übersetzung der
          niederländischen Fassung; bei Abweichungen gilt der niederländische Text.
        </p>
      </Section>
    </>
  );
}

const CONTENT = { nl: PrivacyNl, en: PrivacyEn, de: PrivacyDe };

function Privacy() {
  const { t, lang, formatDate } = useTranslation();
  const Content = CONTENT[lang] ?? PrivacyNl;

  return (
    <main className="mx-auto flex max-w-3xl flex-col px-4 py-10 md:px-8">
      <h1 className="font-display text-2xl font-semibold text-text">{t('privacy.title')}</h1>
      <p className="mt-1 text-sm text-text-muted">
        {t('privacy.updated', { date: formatDate(UPDATED, { dateStyle: 'long' }) })}
      </p>
      <div className="mt-8 flex flex-col gap-8 leading-relaxed text-text-muted">
        <Content />
      </div>
    </main>
  );
}

export default Privacy;
