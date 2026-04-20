/**
 * Incremental content "fill" script. Runs on every Vercel deploy AFTER
 * the bootstrap seed. Idempotent — uses upsert / skipDuplicates so it
 * never overwrites edits the admin makes through the panel and never
 * creates duplicates on re-runs.
 *
 * To add more content later: just append to the arrays below and push.
 * The next deploy will pick up the new items automatically.
 */
// NOTE: `@prisma/client` is a stub that exports PrismaClient as `any`.
// The real generated types live at src/generated/prisma but have no
// path alias, so we skip the enum imports and rely on the runtime
// Prisma client to validate strings against the schema enums.
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function getGenre(slug: string) {
  return prisma.genre.findUnique({ where: { slug } });
}

async function upsertGenre(data: {
  slug: string;
  nameTr: string;
  nameEn: string;
  order: number;
  image?: string;
  parentId?: string | null;
  descriptionTr?: string;
  descriptionEn?: string;
}) {
  return prisma.genre.upsert({
    where: { slug: data.slug },
    update: {}, // never overwrite admin edits
    create: data,
  });
}

async function upsertArtist(data: {
  slug: string;
  name: string;
  type: string;
  image?: string;
  bioTr?: string;
  bioEn?: string;
}) {
  return prisma.artist.upsert({
    where: { slug: data.slug },
    update: {},
    create: { ...data } as any,
  });
}

async function upsertArticle(data: {
  slug: string;
  titleTr: string;
  titleEn: string;
  contentTr: string;
  contentEn: string;
  category: string;
  featuredImage?: string;
  authorId: string;
  status?: string;
  publishedAt?: Date;
  relatedGenreId?: string;
  relatedArtistId?: string;
}) {
  return prisma.article.upsert({
    where: { slug: data.slug },
    update: {},
    create: {
      ...data,
      status: data.status ?? 'PUBLISHED',
    } as any,
  });
}

async function upsertListeningPath(data: {
  slug: string;
  titleTr: string;
  titleEn: string;
  descriptionTr: string;
  descriptionEn: string;
  type: string;
  image?: string;
}) {
  return prisma.listeningPath.upsert({
    where: { slug: data.slug },
    update: {},
    create: { ...data } as any,
  });
}

async function main() {
  console.log('▸ Fill-content başlıyor...');

  // Bootstrap seed must have run — bail safely otherwise.
  const rock = await getGenre('rock');
  if (!rock) {
    console.log('Bootstrap seed yapılmamış — fill-content atlanıyor.');
    return;
  }

  const jazz = await getGenre('jazz');
  const electronic = await getGenre('electronic');
  const rap = await getGenre('rap');
  const pop = await getGenre('pop');
  const soul = await getGenre('soul');
  const rnb = await getGenre('rnb');
  const reggae = await getGenre('reggae');
  const country = await getGenre('country');
  const traditional = await getGenre('traditional');
  const blues = await getGenre('blues');

  const admin = await prisma.user.findUnique({
    where: { email: 'admin@beyondthemusic.com' },
  });

  // ─── NEW MAIN GENRES ─────────────────────────────────────────────
  const metal = await upsertGenre({
    slug: 'metal',
    nameTr: 'Metal',
    nameEn: 'Metal',
    order: 17,
    image: 'https://images.unsplash.com/photo-1551847812-f815b31ee158?w=800&q=80',
    descriptionTr:
      "Metal, 1960'ların sonu ve 70'lerin başında rock'ın en sert kanadından doğdu. Black Sabbath'ın ağır gitar tonları, Led Zeppelin'in epik ölçeği ve Deep Purple'ın hız tutkusu birleşince ortaya yeni bir tür çıktı. Distortion sınır tanımıyordu artık — sound bir duvar gibi yükseliyordu. Metal kimliktir; bir uniforma, bir duruş, bir anlık reddediş.",
    descriptionEn:
      "Metal was born from rock's heaviest wing in the late 1960s and early 70s. When Black Sabbath's heavy guitar tones, Led Zeppelin's epic scale, and Deep Purple's love of speed merged, a new genre emerged. Distortion knew no bounds — sound rose like a wall. Metal is identity; a uniform, a stance, an act of refusal.",
  });

  const folk = await upsertGenre({
    slug: 'folk',
    nameTr: 'Folk',
    nameEn: 'Folk',
    order: 18,
    image: 'https://images.unsplash.com/photo-1485579149621-3123dd979885?w=800&q=80',
    descriptionTr:
      "Folk, halkın müziğidir. Akustik gitar, banjo, mandolin ve tek bir ses; öykü anlatma sanatı. 1960'larda Bob Dylan, Joan Baez ve Woody Guthrie'nin elinde toplumsal bir silaha dönüştü. Sözleri politiktir, sade ama derindir. Folk dinlemek bir tanıklıktır.",
    descriptionEn:
      "Folk is the music of the people. Acoustic guitar, banjo, mandolin, and a single voice — the art of storytelling. In the 1960s, in the hands of Bob Dylan, Joan Baez, and Woody Guthrie, it became a social weapon. Its lyrics are political, simple yet deep. Listening to folk is bearing witness.",
  });

  const indie = await upsertGenre({
    slug: 'indie',
    nameTr: 'Indie',
    nameEn: 'Indie',
    order: 19,
    image: 'https://images.unsplash.com/photo-1516280440614-37939bbacd81?w=800&q=80',
    descriptionTr:
      "Indie bir ses değil, bir tutumdur. Major plak şirketlerine bağlı kalmadan, kendi kayıtlarını çıkaran sanatçıların oluşturduğu geniş bir alan. Indie rock, indie pop, indie folk — hepsi bağımsızlık fikrinden doğar. DIY etiği, lo-fi prodüksiyon ve samimiyet bu türün ortak paydası.",
    descriptionEn:
      "Indie is not a sound but an attitude. A broad space created by artists who release their own records without being tied to major labels. Indie rock, indie pop, indie folk — all born from the idea of independence. DIY ethics, lo-fi production, and intimacy are the common ground.",
  });

  const world = await upsertGenre({
    slug: 'world',
    nameTr: 'Dünya Müziği',
    nameEn: 'World Music',
    order: 20,
    image: 'https://images.unsplash.com/photo-1504609813442-a8924e83f76e?w=800&q=80',
    descriptionTr:
      "Dünya müziği, batılı ana akımın dışında kalan tüm kültürel müzik geleneklerini kapsar. K-Pop'tan Afrobeats'e, Hint klasik müziğinden Brezilyalı MPB'ye, türlerin coğrafi sınırları yıkıldığı çağda bu kategori kültürel bir köprüdür.",
    descriptionEn:
      "World music encompasses all cultural music traditions outside the Western mainstream. From K-Pop to Afrobeats, from Indian classical to Brazilian MPB — in an era when genre's geographic boundaries are collapsing, this category is a cultural bridge.",
  });

  console.log('  ✓ 4 yeni ana tür eklendi');

  // ─── NEW SUBGENRES ───────────────────────────────────────────────
  const newSubgenres: Array<{
    slug: string;
    nameTr: string;
    nameEn: string;
    parent: { id: string } | null;
    order: number;
    image?: string;
  }> = [
    // Metal subgenres
    { slug: 'heavy-metal', nameTr: 'Heavy Metal', nameEn: 'Heavy Metal', parent: metal, order: 1, image: 'https://images.unsplash.com/photo-1505739679850-7adfaf102fc6?w=800&q=80' },
    { slug: 'thrash-metal', nameTr: 'Thrash Metal', nameEn: 'Thrash Metal', parent: metal, order: 2 },
    { slug: 'death-metal', nameTr: 'Death Metal', nameEn: 'Death Metal', parent: metal, order: 3 },
    { slug: 'black-metal', nameTr: 'Black Metal', nameEn: 'Black Metal', parent: metal, order: 4 },
    { slug: 'doom-metal', nameTr: 'Doom Metal', nameEn: 'Doom Metal', parent: metal, order: 5 },
    { slug: 'power-metal', nameTr: 'Power Metal', nameEn: 'Power Metal', parent: metal, order: 6 },

    // Folk subgenres
    { slug: 'folk-rock', nameTr: 'Folk Rock', nameEn: 'Folk Rock', parent: folk, order: 1 },
    { slug: 'indie-folk', nameTr: 'Indie Folk', nameEn: 'Indie Folk', parent: folk, order: 2 },
    { slug: 'americana', nameTr: 'Americana', nameEn: 'Americana', parent: folk, order: 3 },
    { slug: 'celtic-folk', nameTr: 'Celtic Folk', nameEn: 'Celtic Folk', parent: folk, order: 4 },

    // Indie subgenres
    { slug: 'indie-rock', nameTr: 'Indie Rock', nameEn: 'Indie Rock', parent: indie, order: 1 },
    { slug: 'indie-pop', nameTr: 'Indie Pop', nameEn: 'Indie Pop', parent: indie, order: 2 },
    { slug: 'lo-fi', nameTr: 'Lo-Fi', nameEn: 'Lo-Fi', parent: indie, order: 3 },

    // World subgenres
    { slug: 'k-pop', nameTr: 'K-Pop', nameEn: 'K-Pop', parent: world, order: 1, image: 'https://images.unsplash.com/photo-1516280440614-37939bbacd81?w=800&q=80' },
    { slug: 'j-pop', nameTr: 'J-Pop', nameEn: 'J-Pop', parent: world, order: 2 },
    { slug: 'afrobeats', nameTr: 'Afrobeats', nameEn: 'Afrobeats', parent: world, order: 3 },
    { slug: 'mpb', nameTr: 'MPB', nameEn: 'MPB', parent: world, order: 4 },

    // More electronic subgenres
    { slug: 'house', nameTr: 'House', nameEn: 'House', parent: electronic, order: 4 },
    { slug: 'techno', nameTr: 'Techno', nameEn: 'Techno', parent: electronic, order: 5 },
    { slug: 'drum-and-bass', nameTr: 'Drum & Bass', nameEn: 'Drum & Bass', parent: electronic, order: 6 },
    { slug: 'dubstep', nameTr: 'Dubstep', nameEn: 'Dubstep', parent: electronic, order: 7 },
    { slug: 'synthwave', nameTr: 'Synthwave', nameEn: 'Synthwave', parent: electronic, order: 8 },
    { slug: 'idm', nameTr: 'IDM', nameEn: 'IDM', parent: electronic, order: 9 },
    { slug: 'trip-hop', nameTr: 'Trip-Hop', nameEn: 'Trip-Hop', parent: electronic, order: 10 },

    // More rock subgenres
    { slug: 'shoegaze', nameTr: 'Shoegaze', nameEn: 'Shoegaze', parent: rock, order: 7 },
    { slug: 'post-rock', nameTr: 'Post-Rock', nameEn: 'Post-Rock', parent: rock, order: 8 },
    { slug: 'math-rock', nameTr: 'Math Rock', nameEn: 'Math Rock', parent: rock, order: 9 },
    { slug: 'krautrock', nameTr: 'Krautrock', nameEn: 'Krautrock', parent: rock, order: 10 },
    { slug: 'garage-rock', nameTr: 'Garage Rock', nameEn: 'Garage Rock', parent: rock, order: 11 },
    { slug: 'emo', nameTr: 'Emo', nameEn: 'Emo', parent: rock, order: 12 },

    // More rap subgenres
    { slug: 'trap', nameTr: 'Trap', nameEn: 'Trap', parent: rap, order: 3 },
    { slug: 'drill', nameTr: 'Drill', nameEn: 'Drill', parent: rap, order: 4 },
    { slug: 'conscious-hip-hop', nameTr: 'Conscious Hip-Hop', nameEn: 'Conscious Hip-Hop', parent: rap, order: 5 },

    // More jazz subgenres
    { slug: 'cool-jazz', nameTr: 'Cool Jazz', nameEn: 'Cool Jazz', parent: jazz, order: 4 },
    { slug: 'hard-bop', nameTr: 'Hard Bop', nameEn: 'Hard Bop', parent: jazz, order: 5 },
    { slug: 'jazz-fusion', nameTr: 'Jazz Fusion', nameEn: 'Jazz Fusion', parent: jazz, order: 6 },
    { slug: 'free-jazz', nameTr: 'Free Jazz', nameEn: 'Free Jazz', parent: jazz, order: 7 },

    // More pop subgenres
    { slug: 'synth-pop', nameTr: 'Synth-Pop', nameEn: 'Synth-Pop', parent: pop, order: 3 },
    { slug: 'dream-pop', nameTr: 'Dream Pop', nameEn: 'Dream Pop', parent: pop, order: 4 },

    // More soul / r&b
    { slug: 'neo-soul', nameTr: 'Neo-Soul', nameEn: 'Neo-Soul', parent: soul, order: 1 },
    { slug: 'philly-soul', nameTr: 'Philly Soul', nameEn: 'Philly Soul', parent: soul, order: 2 },
    { slug: 'alternative-rnb', nameTr: 'Alternative R&B', nameEn: 'Alternative R&B', parent: rnb, order: 1 },

    // Reggae / country
    { slug: 'dub', nameTr: 'Dub', nameEn: 'Dub', parent: reggae, order: 1 },
    { slug: 'dancehall', nameTr: 'Dancehall', nameEn: 'Dancehall', parent: reggae, order: 2 },
    { slug: 'ska', nameTr: 'Ska', nameEn: 'Ska', parent: reggae, order: 3 },
    { slug: 'outlaw-country', nameTr: 'Outlaw Country', nameEn: 'Outlaw Country', parent: country, order: 2 },
    { slug: 'alt-country', nameTr: 'Alt-Country', nameEn: 'Alt-Country', parent: country, order: 3 },

    // Blues
    { slug: 'delta-blues', nameTr: 'Delta Blues', nameEn: 'Delta Blues', parent: blues, order: 2 },
  ];

  for (const g of newSubgenres) {
    if (!g.parent) continue;
    await upsertGenre({
      slug: g.slug,
      nameTr: g.nameTr,
      nameEn: g.nameEn,
      parentId: g.parent.id,
      order: g.order,
      image: g.image,
    });
  }
  console.log(`  ✓ ${newSubgenres.length} alt tür eklendi (varsa atlandı)`);

  // ─── NEW ARTISTS ─────────────────────────────────────────────────
  const blackSabbath = await upsertArtist({
    slug: 'black-sabbath',
    name: 'Black Sabbath',
    type: 'GROUP',
    image: 'https://images.unsplash.com/photo-1505739679850-7adfaf102fc6?w=600&q=80',
    bioTr:
      "Black Sabbath, 1968'de Birmingham'da kuruldu ve heavy metal'in mucidi olarak kabul edilir. Tony Iommi'nin parmak ucundaki sakatlığı, gitar telgisini gevşetmesine yol açtı; o ağır, karanlık ton metalin imzası oldu. Ozzy Osbourne'un vokali ve grubun okült temaları, türün estetik DNA'sını oluşturdu.",
    bioEn:
      "Black Sabbath was founded in 1968 in Birmingham and is considered the inventor of heavy metal. An injury to Tony Iommi's fingertip led him to detune his guitar; that heavy, dark tone became metal's signature. Ozzy Osbourne's vocals and the band's occult themes formed the genre's aesthetic DNA.",
  });

  const bobDylan = await upsertArtist({
    slug: 'bob-dylan',
    name: 'Bob Dylan',
    type: 'SOLO',
    image: 'https://images.unsplash.com/photo-1485579149621-3123dd979885?w=600&q=80',
    bioTr:
      "Bob Dylan, 20. yüzyıl popüler müziğinin söz yazarlığını edebiyat seviyesine çıkardı. 1960'ların sivil haklar hareketinin sesi oldu, sonra elektrikli gitarı eline aldığında folk saflığını ihlal etmekle suçlandı. 2016'da edebiyat dalında Nobel ödülü kazandı — bu ödülü alan ilk müzisyen olarak.",
    bioEn:
      "Bob Dylan elevated 20th-century popular music's songwriting to the level of literature. He became the voice of the 1960s civil rights movement, then was accused of violating folk purity when he picked up an electric guitar. In 2016 he won the Nobel Prize in Literature — the first musician to receive it.",
  });

  const daftPunk = await upsertArtist({
    slug: 'daft-punk',
    name: 'Daft Punk',
    type: 'GROUP',
    image: 'https://images.unsplash.com/photo-1516280440614-37939bbacd81?w=600&q=80',
    bioTr:
      "Daft Punk, Thomas Bangalter ve Guy-Manuel de Homem-Christo'nun 1993'te Paris'te kurduğu Fransız elektronik ikilisidir. Robot maskeleri ardına gizlenerek sahnedeki kimliği yapay olanla bütünleştirdiler. Discovery (2001) ve Random Access Memories (2013) elektronik müzik kanonunun temel albümlerindendir. 2021'de dağıldılar.",
    bioEn:
      "Daft Punk is a French electronic duo founded in 1993 in Paris by Thomas Bangalter and Guy-Manuel de Homem-Christo. Hiding behind robot masks, they merged stage identity with the artificial. Discovery (2001) and Random Access Memories (2013) are foundational albums in the electronic music canon. They disbanded in 2021.",
  });

  const aretha = await upsertArtist({
    slug: 'aretha-franklin',
    name: 'Aretha Franklin',
    type: 'SOLO',
    image: 'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=600&q=80',
    bioTr:
      "Aretha Franklin, 'Soul'un Kraliçesi' olarak anılır. Detroit'in gospel kiliselerinden çıkıp Atlantic Records dönemiyle (1967'den itibaren) soul müziğin tanımını yeniden yazdı. 'Respect', 'Think' ve 'Natural Woman' gibi parçalar, kadın özgürleşmesinin müzikal manifestolarıdır.",
    bioEn:
      "Aretha Franklin is known as the 'Queen of Soul'. From Detroit's gospel churches to her Atlantic Records era (from 1967), she rewrote the definition of soul music. Songs like 'Respect', 'Think', and 'Natural Woman' are musical manifestos of women's liberation.",
  });

  const beatles = await upsertArtist({
    slug: 'the-beatles',
    name: 'The Beatles',
    type: 'GROUP',
    image: 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=600&q=80',
    bioTr:
      "The Beatles, 1960'ta Liverpool'da kuruldu ve modern popüler müziğin akışını değiştirdi. John Lennon, Paul McCartney, George Harrison ve Ringo Starr'ın oluşturduğu dörtlü; sekiz yıllık aktif kariyerinde stüdyo prodüksiyonunu, şarkı yapısını ve albüm kavramını yeniden tanımladı. Sgt. Pepper's, Abbey Road, The White Album — her biri bir dönüm noktasıdır.",
    bioEn:
      "The Beatles formed in Liverpool in 1960 and changed the course of modern popular music. The quartet of John Lennon, Paul McCartney, George Harrison, and Ringo Starr — in their eight-year active career — redefined studio production, song structure, and the concept of an album. Sgt. Pepper's, Abbey Road, The White Album — each is a turning point.",
  });

  const tupac = await upsertArtist({
    slug: 'tupac-shakur',
    name: '2Pac',
    type: 'SOLO',
    image: 'https://images.unsplash.com/photo-1483412033650-1015ddeb83d1?w=600&q=80',
    bioTr:
      "Tupac Amaru Shakur, 90'lar West Coast rap sahnesinin en önemli ismi ve hip-hop'ın şair-aktivist figürüdür. Annesi Black Panther üyesi olan Tupac, müziğine sosyal eleştiri ve siyahi varoluşun çelişkilerini taşıdı. 1996'daki suikastı çözülmemiş bir sır olarak kaldı; mirası ise giderek büyüdü.",
    bioEn:
      "Tupac Amaru Shakur was the most important name in 90s West Coast rap and hip-hop's poet-activist figure. His mother a Black Panther member, Tupac brought social critique and the contradictions of Black existence to his music. His 1996 assassination remains an unsolved mystery; his legacy keeps growing.",
  });

  const coltrane = await upsertArtist({
    slug: 'john-coltrane',
    name: 'John Coltrane',
    type: 'SOLO',
    image: 'https://images.unsplash.com/photo-1511192336575-5a79af67a629?w=600&q=80',
    bioTr:
      "John Coltrane, jazz tarihinin en etkili saksafoncularından biridir. Miles Davis ile çalıştığı yıllardan sonra solo kariyerinde modal jazz, free jazz ve manevi jazz gibi yeni bölgeler açtı. A Love Supreme (1965) ruhani bir başyapıt; Giant Steps ise harmonik tekniğin sınırlarını zorlayan bir manifestodur.",
    bioEn:
      "John Coltrane is one of the most influential saxophonists in jazz history. After his years with Miles Davis, he opened new territories in his solo career — modal jazz, free jazz, and spiritual jazz. A Love Supreme (1965) is a spiritual masterpiece; Giant Steps is a manifesto pushing the limits of harmonic technique.",
  });

  const beyonce = await upsertArtist({
    slug: 'beyonce',
    name: 'Beyoncé',
    type: 'SOLO',
    image: 'https://images.unsplash.com/photo-1485579149621-3123dd979885?w=600&q=80',
    bioTr:
      "Beyoncé Knowles-Carter, 2000'lerden bu yana popüler müziğin en etkili sanatçılarından biridir. Destiny's Child sonrası solo kariyerinde Lemonade (2016) gibi konsept albümlerle pop, R&B, soul ve siyah feminist düşünceyi tek bir görsel-müzikal anlatıda birleştirdi.",
    bioEn:
      "Beyoncé Knowles-Carter has been one of popular music's most influential artists since the 2000s. After Destiny's Child, in her solo career — with concept albums like Lemonade (2016) — she merged pop, R&B, soul, and Black feminist thought into a single visual-musical narrative.",
  });

  console.log('  ✓ 8 yeni sanatçı eklendi (varsa atlandı)');

  // ─── ARTIST ↔ GENRE LINKS (idempotent) ───────────────────────────
  const heavyMetal = await getGenre('heavy-metal');
  const folkRock = await getGenre('folk-rock');
  const house = await getGenre('house');
  const consciousHipHop = await getGenre('conscious-hip-hop');
  const altRnb = await getGenre('alternative-rnb');

  const links: Array<{ artistId: string; genreId: string }> = [];
  if (heavyMetal) links.push({ artistId: blackSabbath.id, genreId: heavyMetal.id });
  links.push({ artistId: blackSabbath.id, genreId: metal.id });
  links.push({ artistId: bobDylan.id, genreId: folk.id });
  if (folkRock) links.push({ artistId: bobDylan.id, genreId: folkRock.id });
  links.push({ artistId: daftPunk.id, genreId: electronic!.id });
  if (house) links.push({ artistId: daftPunk.id, genreId: house.id });
  links.push({ artistId: aretha.id, genreId: soul!.id });
  links.push({ artistId: aretha.id, genreId: rnb!.id });
  links.push({ artistId: beatles.id, genreId: rock.id });
  links.push({ artistId: beatles.id, genreId: pop!.id });
  links.push({ artistId: tupac.id, genreId: rap!.id });
  if (consciousHipHop) links.push({ artistId: tupac.id, genreId: consciousHipHop.id });
  links.push({ artistId: coltrane.id, genreId: jazz!.id });
  links.push({ artistId: beyonce.id, genreId: rnb!.id });
  links.push({ artistId: beyonce.id, genreId: pop!.id });
  if (altRnb) links.push({ artistId: beyonce.id, genreId: altRnb.id });

  await prisma.artistGenre.createMany({ data: links, skipDuplicates: true });
  console.log(`  ✓ ${links.length} sanatçı-tür bağı kontrol edildi`);

  // ─── NEW ARTICLES ────────────────────────────────────────────────
  if (admin) {
    await upsertArticle({
      slug: 'metal-sound-of-steel',
      titleTr: 'Heavy Metal: Çeliğin Sesi',
      titleEn: 'Heavy Metal: The Sound of Steel',
      contentTr:
        "<p>Heavy metal'in doğuşu için tek bir an gösterilebilir: 13 Şubat 1970. Black Sabbath'ın ilk albümünün vinyl plakta dünyaya açıldığı gün. Kapakta puslu bir manzara önünde duran karanlık bir figür, içeride distortion'ın yeni bir tanımı.</p><h2>Birmingham'ın Demir İşçileri</h2><p>Birmingham, İngiltere'nin sanayi kalbiydi. Tony Iommi gençken bir presste parmak ucunu kaybetti — gitar çalmaya devam etmek için tellere daha düşük bir gerilim uyguladı, sound otomatik olarak ağırlaştı. Bir sakatlık, bir türü doğurdu.</p><h2>Estetik Olarak Metal</h2><p>Metal yalnızca bir ses değildir; bir uniformadır. Siyah deri, uzun saç, batık logolar, ön kapak sanatı — bunların hepsi türün görsel grameridir. Saygı, kabilelik ve karanlığa hayranlık üzerine kurulu bir alt kültür.</p>",
      contentEn:
        "<p>A single moment can mark the birth of heavy metal: February 13, 1970. The day Black Sabbath's debut album opened to the world on vinyl. On the cover, a dark figure stands before a misty landscape; inside, a new definition of distortion.</p><h2>The Iron Workers of Birmingham</h2><p>Birmingham was England's industrial heart. As a young man, Tony Iommi lost a fingertip in a press — to keep playing guitar he detuned the strings, and the sound automatically grew heavier. An injury birthed a genre.</p><h2>Metal as Aesthetic</h2><p>Metal is not just a sound; it's a uniform. Black leather, long hair, sunken logos, cover art — all are part of the genre's visual grammar. A subculture built on respect, tribalism, and reverence for the dark.</p>",
      category: 'GENRE',
      featuredImage: 'https://images.unsplash.com/photo-1551847812-f815b31ee158?w=1200&q=80',
      authorId: admin.id,
      publishedAt: new Date('2024-07-10'),
      relatedGenreId: metal.id,
      relatedArtistId: blackSabbath.id,
    });

    await upsertArticle({
      slug: 'k-pop-global-rise',
      titleTr: "K-Pop'un Küresel Yükselişi",
      titleEn: "The Global Rise of K-Pop",
      contentTr:
        "<p>2010'ların ortasında BTS, dünyanın dört bir yanında stadyumlar dolduran bir gruba dönüştü. Bu, Kore Dalgası'nın (Hallyu) on yıllar süren bir altyapıyı kullanarak küresel popüler müziğin merkezine oturmasıydı.</p><h2>Sistem ve Estetik</h2><p>K-Pop yalnızca bir tür değil, bir endüstriyel sistemdir. Trainee dönemi, görsel direktörlük, koreografi, fan etkileşimi — her aşama tasarlanmış. SM, YG, JYP ve sonradan HYBE gibi ajanslar müziğin görsel-pop kültür uzantısını mükemmelleştirdi.</p><h2>Sözden Sahneye</h2><p>K-Pop, Korece sözlerle global izleyiciye seslenmenin mümkün olduğunu kanıtladı. Fandom kültürü, sosyal medya entegrasyonu ve sürekli yenilenen konseptler türü dinamik tuttu. Bugün BLACKPINK, NewJeans ve diğer gruplar K-pop'un sınır tanımayan etkisini sürdürüyor.</p>",
      contentEn:
        "<p>In the mid-2010s, BTS transformed into a group filling stadiums around the world. This was the Korean Wave (Hallyu) leveraging decades of infrastructure to take its place at the center of global popular music.</p><h2>System and Aesthetic</h2><p>K-Pop is not just a genre but an industrial system. Trainee period, visual direction, choreography, fan interaction — every stage is designed. Agencies like SM, YG, JYP, and later HYBE perfected music as a visual-pop cultural extension.</p><h2>From Words to Stage</h2><p>K-Pop proved that addressing a global audience in Korean was possible. Fandom culture, social media integration, and constantly renewed concepts kept the genre dynamic. Today BLACKPINK, NewJeans, and other groups continue K-Pop's borderless influence.</p>",
      category: 'CULTURAL_IMPACT',
      featuredImage: 'https://images.unsplash.com/photo-1516280440614-37939bbacd81?w=1200&q=80',
      authorId: admin.id,
      publishedAt: new Date('2024-08-22'),
    });

    await upsertArticle({
      slug: 'house-music-chicago',
      titleTr: "House Music: Chicago'dan Dünyaya",
      titleEn: "House Music: From Chicago to the World",
      contentTr:
        "<p>House müzik, 1980'lerin başında Chicago'nun The Warehouse adlı kulübünde doğdu — türün adı da o mekândan geldi. DJ Frankie Knuckles, disko'nun ölmediğini, sadece form değiştirdiğini kanıtladı.</p><h2>Roland'ın Hediyesi</h2><p>House'un sound'unu mümkün kılan teknoloji Roland TR-808 ve TR-909 drum machine'lerdi. Dört vuruşlu temel, hipnotik bas çizgisi ve gospel kökenli vokal sample'lar — bu üç katman house'un DNA'sıdır.</p><h2>Detroit, New York, Berlin</h2><p>Chicago'dan sonra Detroit teknoyu üretti, New York garage'ı geliştirdi, Berlin ise minimal teknoyu kürürselleştirdi. House, bütün bu sahnelerin ortak kökeniydi — ve hâlâ küresel kulüp kültürünün omurgasıdır.</p>",
      contentEn:
        "<p>House music was born in the early 1980s at a Chicago club called The Warehouse — the genre's name comes from that venue. DJ Frankie Knuckles proved that disco hadn't died, it had just changed form.</p><h2>Roland's Gift</h2><p>The technology that made house's sound possible was Roland's TR-808 and TR-909 drum machines. Four-on-the-floor foundation, hypnotic bassline, and gospel-rooted vocal samples — these three layers are house's DNA.</p><h2>Detroit, New York, Berlin</h2><p>After Chicago, Detroit produced techno, New York developed garage, Berlin globalized minimal techno. House was the common origin of all these scenes — and still the backbone of global club culture.</p>",
      category: 'GENRE',
      featuredImage: 'https://images.unsplash.com/photo-1470229722913-7c0e2dbbafd3?w=1200&q=80',
      authorId: admin.id,
      publishedAt: new Date('2024-09-15'),
      relatedGenreId: electronic!.id,
    });

    await upsertArticle({
      slug: 'dylan-poet-of-songwriting',
      titleTr: 'Bob Dylan: Söz Yazarlığının Şairi',
      titleEn: 'Bob Dylan: The Poet of Songwriting',
      contentTr:
        "<p>Bob Dylan, 2016'da Nobel Edebiyat Ödülü'nü aldığında müzik dünyasıyla edebiyat dünyası arasında yıllardır gerilen sınır son kez sorgulandı. Ödül komitesi gerekçesinde 'büyük Amerikan şarkı geleneği içinde yeni şiirsel ifadeler yaratmak' dedi.</p><h2>Folk'tan Elektriğe</h2><p>1965'te Newport Folk Festival'inde elektrikli gitarla sahneye çıktığında izleyiciler ıslıkladı. Bu an, folk'un saflık takıntısını kıran simgesel bir kopuştu. Highway 61 Revisited ve Blonde on Blonde albümleri, popüler müziğin söz yazarlığını edebiyat seviyesine çıkardı.</p><h2>Sürekli Dönüşüm</h2><p>Dylan altmış yıl boyunca kimliğini yeniden tanımlamaktan vazgeçmedi: gospel, country, blues, klasik standartlar. Her dönüşüm, popüler müziğe söz yazarlığının bir kalıba sığmadığını öğretti.</p>",
      contentEn:
        "<p>When Bob Dylan won the Nobel Prize in Literature in 2016, the boundary between music and literature was questioned for the last time. The committee's citation read: 'for having created new poetic expressions within the great American song tradition.'</p><h2>From Folk to Electric</h2><p>When he took the stage with an electric guitar at the 1965 Newport Folk Festival, the audience booed. That moment was a symbolic break from folk's purity obsession. Highway 61 Revisited and Blonde on Blonde elevated popular music's songwriting to the level of literature.</p><h2>Constant Transformation</h2><p>Dylan never stopped redefining his identity for sixty years: gospel, country, blues, classical standards. Each transformation taught popular music that songwriting cannot be confined to a single mold.</p>",
      category: 'CULTURAL_IMPACT',
      featuredImage: 'https://images.unsplash.com/photo-1485579149621-3123dd979885?w=1200&q=80',
      authorId: admin.id,
      publishedAt: new Date('2024-10-08'),
      relatedArtistId: bobDylan.id,
    });

    await upsertArticle({
      slug: 'aretha-respect-anthem',
      titleTr: "Aretha Franklin: 'Respect' ve Bir Marş",
      titleEn: "Aretha Franklin: 'Respect' and an Anthem",
      contentTr:
        "<p>1967'de Aretha Franklin, Otis Redding'in 'Respect' parçasını yeniden yorumladığında popüler müziğin politikası değişti. Şarkı, bir erkeğin saygı talebinden bir kadının özgürleşme manifestosuna dönüştü.</p><h2>Stüdyodaki An</h2><p>Atlantic Records'un Muscle Shoals seanslarında Franklin, parçayı kendi gospel kökenli vokal yapısıyla yeniden inşa etti. R-E-S-P-E-C-T spelling'i kendi fikriydi. Bir dakikadan kısa bir prova ile şarkı bir efsaneye dönüştü.</p><h2>Soul'un Tanımı</h2><p>Aretha, soul'un yalnızca müzikal bir tür değil, bir varoluş hâli olduğunu gösterdi. Onun sesi, gospel'ın spiritüalitesi ile pop'un erişilebilirliğini birleştiriyordu. Soul'un Kraliçesi unvanı bir abartı değil, bir tarif.</p>",
      contentEn:
        "<p>In 1967, when Aretha Franklin reinterpreted Otis Redding's 'Respect', the politics of popular music changed. The song transformed from a man's demand for respect into a woman's manifesto of liberation.</p><h2>The Studio Moment</h2><p>In Atlantic Records' Muscle Shoals sessions, Franklin rebuilt the track with her gospel-rooted vocal structure. The R-E-S-P-E-C-T spelling was her idea. With less than a minute of rehearsal, the song became a legend.</p><h2>The Definition of Soul</h2><p>Aretha showed that soul is not just a musical genre but a state of being. Her voice combined gospel's spirituality with pop's accessibility. The Queen of Soul title is not exaggeration but description.</p>",
      category: 'CULTURAL_IMPACT',
      featuredImage: 'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=1200&q=80',
      authorId: admin.id,
      publishedAt: new Date('2024-11-04'),
      relatedArtistId: aretha.id,
    });

    console.log('  ✓ 5 yeni makale eklendi (varsa atlandı)');
  }

  // ─── NEW LISTENING PATHS ─────────────────────────────────────────
  await upsertListeningPath({
    slug: 'metal-roots',
    titleTr: "Metal'in Kökleri",
    titleEn: "The Roots of Metal",
    descriptionTr: "Black Sabbath'tan Metallica'ya, Iron Maiden'dan Slayer'a — heavy metalin temel taşlarına bir yolculuk.",
    descriptionEn: "From Black Sabbath to Metallica, Iron Maiden to Slayer — a journey through heavy metal's cornerstones.",
    type: 'INTRO',
    image: 'https://images.unsplash.com/photo-1551847812-f815b31ee158?w=800&q=80',
  });

  await upsertListeningPath({
    slug: 'sunday-morning-folk',
    titleTr: 'Pazar Sabahı Folk',
    titleEn: 'Sunday Morning Folk',
    descriptionTr: 'Akustik gitar, sıcak vokal, sade şarkı yapıları. Pazar sabahının sakinliğini taşıyan bir liste.',
    descriptionEn: 'Acoustic guitar, warm vocals, simple song structures. A playlist carrying the calm of a Sunday morning.',
    type: 'EMOTION',
    image: 'https://images.unsplash.com/photo-1485579149621-3123dd979885?w=800&q=80',
  });

  await upsertListeningPath({
    slug: 'late-night-electronic',
    titleTr: 'Gece Yarısı Elektronik',
    titleEn: 'Late Night Electronic',
    descriptionTr: 'Daft Punk, Aphex Twin, Boards of Canada — gece yarısı kulaklığı için derin bir elektronik rotası.',
    descriptionEn: 'Daft Punk, Aphex Twin, Boards of Canada — a deep electronic route for late-night headphones.',
    type: 'CONTRAST',
    image: 'https://images.unsplash.com/photo-1470229722913-7c0e2dbbafd3?w=800&q=80',
  });

  console.log('  ✓ 3 yeni dinleme rotası eklendi (varsa atlandı)');

  console.log('✅ Fill-content tamamlandı.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
