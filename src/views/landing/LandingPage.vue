<script setup lang="ts">
import { RouterLink } from "vue-router"
import { onMounted, ref } from "vue"
import axios from "axios"

import type { ActivityResponse } from "@/interfaces/activity.interface"

import logoImage from "@/assets/landing/logo-ash-sholihati.png"
import heroImage from "@/assets/landing/hero-children.png"
import iconFacilityMusholla from "@/assets/landing/icon-facility-musholla.svg"
import iconFacilityHall from "@/assets/landing/icon-facility-hall.svg"
import iconProgramEducation from "@/assets/landing/icon-program-education.svg"
import iconProgramSocial from "@/assets/landing/icon-program-social.svg"
import iconProgramSkills from "@/assets/landing/icon-program-skills.svg"
import iconCalendar from "@/assets/landing/icon-calendar.svg"
import iconLocation from "@/assets/landing/icon-location.svg"
import iconArrowRight from "@/assets/landing/icon-arrow-right.svg"
import iconArrowRightSmall from "@/assets/landing/icon-arrow-right-small.svg"
import iconDonasi from "@/assets/landing/icon-donasi.svg"
import iconRelawan from "@/assets/landing/icon-relawan.svg"
import iconKolaborasi from "@/assets/landing/icon-kolaborasi.svg"
import iconFooterLocation from "@/assets/landing/icon-footer-location.svg"
import iconFooterEmail from "@/assets/landing/icon-footer-email.svg"
import iconFooterPhone from "@/assets/landing/icon-footer-phone.svg"
import iconSocialOne from "@/assets/landing/icon-social-1.svg"
import iconSocialTwo from "@/assets/landing/icon-social-2.svg"

const educationLevels = ["PAUD", "TK", "SD/MI", "SMP/MTs", "SMA/SMK/MA"]

const facilities = [
  {
    icon: iconFacilityMusholla,
    title: "Musholla",
    description:
      "Yayasan dilengkapi dengan musholla yang menjadi pusat kegiatan keagamaan. Musholla ini tidak hanya digunakan untuk sholat berjamaah, tetapi juga sebagai tempat berlangsungnya program-program keislaman seperti tahfidz Al-Qur'an, pengajian, dan kajian keagamaan.",
  },
  {
    icon: iconFacilityHall,
    title: "Ruang Belajar/Aula Serbaguna",
    description:
      "Ruang belajar digunakan untuk program bimbingan akademik dan tempat pembelajaran ilmu agama yang lebih mendalam, sekaligus sebagai aula serbaguna untuk kegiatan pelatihan dan sosial yang memberikan kesempatan bagi anak-anak untuk terlibat dalam kegiatan pembelajaran yang interaktif dan inspiratif.",
  },
]

const programs = [
  {
    icon: iconProgramEducation,
    title: "Pendidikan Agama",
    description: "Program keagamaan untuk memperkuat iman dan akhlak anak-anak yatim dan dhuafa:",
    items: ["Tahfidz Al-Qur'an", "Tahsin", "Program TAQWA", "Ramadan Camp"],
  },
  {
    icon: iconProgramSocial,
    title: "Bantuan Sosial",
    description: "Dukungan kesejahteraan untuk anak yatim dan dhuafa:",
    items: [
      "Bantuan Pendidikan",
      "Sembako & Makanan Bergizi",
      "Santunan Yatim",
      "Bantuan Kesehatan",
      "Wisata Bersama Yatim",
      "Bunda Yatim Berdaya",
    ],
  },
  {
    icon: iconProgramSkills,
    title: "Keterampilan Praktis",
    description: "Pelatihan untuk kemandirian dan daya saing di era modern:",
    items: [
      "Pengembangan Mental & Motivasi",
      "Bina Bakat Anak",
      "Pelatihan Kemandirian Remaja",
      "Kewirausahaan/Entrepreneurship",
      "Digital/Social Media Marketing",
      "Kerjasama dengan Univ. Abdurachman Saleh",
    ],
  },
]

const impacts = [
  { value: "100+", label: "Anak Yatim & Dhuafa Binaan" },
  { value: "15+", label: "Program Aktif" },
  { value: "50+", label: "Relawan & Donatur" },
]

const fallbackActivities = [
  {
    image: "",
    title: "Pembagian Sembako",
    description:
      "Program rutin pembagian sembako dan makanan bergizi untuk keluarga yatim dan dhuafa di wilayah Situbondo.",
    date: "Oktober 2024",
    programLabel: "Situbondo",
  },
  {
    image: "",
    title: "Ramadhan Camp",
    description:
      "Kegiatan pembinaan spiritual dan keagamaan selama bulan Ramadhan dengan program tahfidz, tahsin, dan kajian Islam.",
    date: "Ramadhan 2025",
    programLabel: "Situbondo",
  },
  {
    image: "",
    title: "Santunan Yatim & Dhuafa",
    description: "Program santunan rutin untuk membantu kebutuhan sehari-hari anak yatim dan keluarga dhuafa.",
    date: "Bulanan",
    programLabel: "Situbondo",
  },
]

const activityCards = ref(fallbackActivities)

type BaseResponse<T> = {
  status: string
  message: string
  data: T
}

const formatMonthYear = (value?: string | null) => {
  if (!value) return ""
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ""
  return new Intl.DateTimeFormat("id-ID", { month: "long", year: "numeric" }).format(date)
}

const mapActivities = (items: ActivityResponse[]) =>
  items.map((item, index) => {
    const fallback = fallbackActivities[index % fallbackActivities.length]
    return {
      image: item.imageUrl || fallback.image,
      title: item.title || fallback.title,
      description: item.description || fallback.description,
      date: formatMonthYear(item.startDate) || fallback.date,
      programLabel: item.program || item.category || "Program",
    }
  })

onMounted(async () => {
  try {
    const response = await axios.get<BaseResponse<ActivityResponse[]>>(
      `${import.meta.env.VITE_API_URL}/activities`,
    )
    const latest = (response.data?.data || [])
      .filter((item) => item && item.createdAt)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, 3)

    if (latest.length) {
      activityCards.value = mapActivities(latest)
    }
  } catch (error) {
    activityCards.value = fallbackActivities
  }
})

const involvement = [
  {
    icon: iconDonasi,
    title: "Donasi",
    description: "Kontribusi Anda sangat berarti untuk keberlangsungan program-program kami.",
  },
  {
    icon: iconRelawan,
    title: "Relawan",
    description: "Berikan waktu dan keahlian Anda untuk membantu program kami.",
  },
  {
    icon: iconKolaborasi,
    title: "Kolaborasi",
    description: "Mari berkolaborasi untuk menciptakan dampak yang lebih luas.",
  },
]
</script>

<template>
  <div class="landing-page">
    <header class="landing-header">
      <div class="landing-container header-content">
        <img class="logo" :src="logoImage" alt="Logo Yayasan Ash Sholihati" />
        <nav class="nav-links">
          <a href="#tentang">Tentang</a>
          <a href="#program">Program</a>
          <a href="#dampak">Dampak</a>
          <a href="#kegiatan">Kegiatan</a>
          <a href="#donasi">Donasi</a>
          <a href="#kontak">Kontak</a>
        </nav>
        <RouterLink class="btn btn-login" to="/auth/login">Login</RouterLink>
      </div>
    </header>

    <section class="hero-section">
      <div class="landing-container hero-content">
        <div class="hero-text">
          <span class="hero-pill">Yayasan Ash Sholihati</span>
          <h1>
            <span>Membawa Kebaikan</span>
            <span>untuk Anak Yatim</span>
            <span class="hero-gradient">dan Dhuafa</span>
          </h1>
          <p>
            Membangun generasi yatim dan dhuafa yang mandiri, berdaya, dan menjadi agen perubahan
            melalui pendidikan agama yang kuat dan keterampilan praktis yang relevan di era modern.
          </p>
        </div>
        <div class="hero-image">
          <img :src="heroImage" alt="Kegiatan anak-anak binaan Yayasan Ash Sholihati" />
        </div>
      </div>
      <span class="hero-glow" aria-hidden="true"></span>
    </section>

    <section class="education-section" aria-labelledby="education-title">
      <div class="landing-container">
        <div class="section-heading center">
          <h2 id="education-title">Anak-anak Binaan Yayasan Ash Sholihati</h2>
          <p>Yayasan Ash Sholihati membina anak yatim dan dhuafa dari berbagai jenjang pendidikan</p>
        </div>
        <div class="education-levels">
          <span v-for="level in educationLevels" :key="level" class="level-pill">{{ level }}</span>
        </div>
      </div>
    </section>

    <section id="tentang" class="about-section">
      <div class="landing-container about-content">
        <div class="section-heading center">
          <h2>Tentang Yayasan</h2>
          <span class="section-underline"></span>
        </div>
        <blockquote>
          "Dan mereka bertanya kepadamu tentang anak yatim, katakanlah: Mengurus urusan mereka secara
          patut adalah baik, dan jika kamu bergaul dengan mereka, maka mereka adalah saudaramu; dan
          Allah mengetahui siapa yang membuat kerusakan dari yang mengadakan perbaikan."
          <span>- QS. Al-Baqarah: 220</span>
        </blockquote>
        <div class="about-text">
          <p>
            <strong>Yayasan Ash Sholihati</strong> diresmikan pada 13 Oktober 2024 dan berlokasi di
            Situbondo, Jawa Timur. Nama "Ash Sholihati" yang berarti "kebaikan", sekaligus merupakan
            nama dari almarhumah Ibunda Hj R Ay Siti Sulehatiningsih, menjadi landasan dari yayasan
            yang membangun Yatim Center dengan komitmen untuk membawa "kebaikan" kepada anak-anak
            yatim dan dhuafa.
          </p>
          <p>
            Yayasan berfokus pada <span>pengembangan karakter, keimanan, serta kemandirian</span>
            melalui pendidikan agama yang kuat dan keterampilan praktis yang relevan di era modern.
            Kami membina anak-anak dari berbagai jenjang pendidikan mulai dari PAUD, TK, SD/MI,
            SMP/MTs, hingga SMA/SMK/MA.
          </p>
          <p>
            Melalui visi ini, <span>Yayasan Ash Sholihati</span> bertekad untuk menciptakan generasi
            yatim dan dhuafa yang tidak hanya mandiri dan berdaya, tetapi juga mampu menjadi agen
            perubahan yang menyebarkan "kebaikan" kepada sesama, khususnya di wilayah Situbondo.
          </p>
        </div>
      </div>
    </section>

    <section id="program" class="facility-section">
      <div class="landing-container">
        <div class="section-heading center">
          <h2>Fasilitas Yayasan</h2>
          <span class="section-underline"></span>
          <p class="section-description">
            Fasilitas yang disiapkan sebagai bentuk dukungan terhadap perkembangan spiritual serta
            keterampilan anak-anak yatim dan dhuafa
          </p>
        </div>
        <div class="facility-grid">
          <article v-for="facility in facilities" :key="facility.title" class="facility-card">
            <div class="facility-icon">
              <img :src="facility.icon" :alt="facility.title" />
            </div>
            <div>
              <h3>{{ facility.title }}</h3>
              <p>{{ facility.description }}</p>
            </div>
          </article>
        </div>
      </div>
    </section>

    <section class="program-section">
      <div class="landing-container">
        <div class="section-heading center">
          <h2>Program Utama Kami</h2>
          <span class="section-underline"></span>
        </div>
        <div class="program-grid">
          <article v-for="program in programs" :key="program.title" class="program-card">
            <div class="program-icon">
              <img :src="program.icon" :alt="program.title" />
            </div>
            <h3>{{ program.title }}</h3>
            <p>{{ program.description }}</p>
            <ul>
              <li v-for="item in program.items" :key="item">{{ item }}</li>
            </ul>
          </article>
        </div>
      </div>
    </section>

    <section id="dampak" class="impact-section">
      <div class="landing-container">
        <div class="section-heading center">
          <h2>Dampak &amp; Pencapaian</h2>
          <span class="section-underline light"></span>
        </div>
        <div class="impact-grid">
          <div v-for="impact in impacts" :key="impact.label" class="impact-item">
            <span class="impact-value">{{ impact.value }}</span>
            <span class="impact-label">{{ impact.label }}</span>
          </div>
        </div>
      </div>
    </section>

    <section id="kegiatan" class="activity-section">
      <div class="landing-container">
        <div class="section-heading center">
          <h2>Kegiatan Yayasan</h2>
          <span class="section-underline"></span>
          <p class="section-description">
            Dokumentasi kegiatan dan program yang telah kami jalankan untuk anak yatim dan dhuafa
          </p>
        </div>
        <div class="activity-grid">
          <article v-for="activity in activityCards" :key="activity.title" class="activity-card" @click="$router.push('/auth/login')">
            <div class="activity-image">
              <img v-if="activity.image" :src="activity.image" :alt="activity.title" />
            </div>
            <div class="activity-body">
              <h3>{{ activity.title }}</h3>
              <p>{{ activity.description }}</p>
              <div class="activity-meta">
                <div>
                  <img :src="iconCalendar" alt="Tanggal" />
                  <span>{{ activity.date }}</span>
                </div>
                <div>
                  <img :src="iconLocation" alt="Program" />
                  <span>Program: {{ activity.programLabel }}</span>
                </div>
              </div>
            </div>
          </article>
        </div>
        <div class="activity-cta">
          <button class="btn btn-gradient" type="button" @click="$router.push('/auth/login')">
            Lihat Semua Kegiatan
            <img :src="iconArrowRight" alt="" aria-hidden="true" />
          </button>
        </div>
      </div>
    </section>

    <section id="donasi" class="involvement-section">
      <div class="landing-container">
        <div class="section-heading center">
          <h2>Cara Terlibat</h2>
          <span class="section-underline"></span>
          <p class="section-description">
            Jadilah bagian dari perubahan positif. Bersama kita bisa memberikan dampak yang lebih
            besar untuk masyarakat.
          </p>
        </div>
        <div class="involvement-grid">
          <article v-for="item in involvement" :key="item.title" class="involvement-card">
            <div class="involvement-icon">
              <img :src="item.icon" :alt="item.title" />
            </div>
            <h3>{{ item.title }}</h3>
            <p>{{ item.description }}</p>
            <button class="link-button" type="button">
              Pelajari Lebih Lanjut
              <img :src="iconArrowRightSmall" alt="" aria-hidden="true" />
            </button>
          </article>
        </div>
      </div>
    </section>

    <footer id="kontak" class="landing-footer">
      <div class="landing-container">
        <div class="footer-top">
          <div class="footer-brand">
            <img :src="logoImage" alt="Logo Yayasan Ash Sholihati" />
            <p>
              Yayasan Ash Sholihati berkomitmen untuk memberikan dampak positif dan berkelanjutan
              bagi masyarakat melalui program pendidikan, kesehatan, dan pemberdayaan.
            </p>
          </div>
          <div class="footer-contact">
            <h4>Kontak</h4>
            <ul>
              <li>
                <img :src="iconFooterLocation" alt="Alamat" />
                <span>
                  Jl. Argopuro Perum Ayuban Jaya Blok F-68, Kelurahan Mimbaan, Kecamatan Panji,
                  Situbondo, Jawa Timur
                </span>
              </li>
              <li>
                <img :src="iconFooterEmail" alt="Email" />
                <span>info@ashsholihati.org</span>
              </li>
              <li>
                <img :src="iconFooterPhone" alt="Telepon" />
                <span>+62 838 3456 7890</span>
              </li>
            </ul>
            <div class="footer-social">
              <a href="#" aria-label="Media sosial">
                <img :src="iconSocialOne" alt="" aria-hidden="true" />
              </a>
              <a href="#" aria-label="Media sosial">
                <img :src="iconSocialTwo" alt="" aria-hidden="true" />
              </a>
            </div>
          </div>
        </div>
        <div class="footer-bottom">(c) 2026 Yayasan Ash Sholihati. All rights reserved.</div>
      </div>
    </footer>
  </div>
</template>

<style scoped>
:global(body) {
  background-color: #fefefe;
}

.landing-page {
  color: #146e61;
  font-family: "Manrope", sans-serif;
}

.landing-container {
  max-width: 1448px;
  margin: 0 auto;
  padding: 0 32px;
}

.landing-header {
  background: rgba(255, 255, 255, 0.95);
  border-bottom: 1px solid #e5e5e5;
  position: sticky;
  top: 0;
  z-index: 10;
}

.header-content {
  display: flex;
  align-items: center;
  justify-content: space-between;
  height: 80px;
}

.logo {
  width: 90px;
  height: 48px;
  object-fit: contain;
}

.nav-links {
  display: flex;
  gap: 32px;
  font-weight: 600;
  font-size: 16px;
}

.nav-links a {
  color: #146e61;
  text-decoration: none;
}

.btn {
  display: inline-flex;
  align-items: center;
  gap: 10px;
  font-weight: 600;
  font-size: 16px;
  border-radius: 10px;
  border: none;
  cursor: pointer;
  padding: 10px 20px;
}

.btn-login {
  background: #77dacd;
  color: #ffffff;
  text-decoration: none;
}

.hero-section {
  position: relative;
  padding: 96px 0 64px;
  background: linear-gradient(143deg, #f6fffd 0%, #ffffff 50%, #f0f9f7 100%);
  overflow: hidden;
}

.hero-content {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 48px;
  align-items: center;
}

.hero-text h1 {
  display: flex;
  flex-direction: column;
  gap: 8px;
  font-family: "Poppins", sans-serif;
  font-weight: 600;
  font-size: 40px;
  line-height: 1.2;
  margin: 24px 0 16px;
}

.hero-text p {
  color: #666666;
  font-size: 20px;
  line-height: 1.6;
  max-width: 580px;
}

.hero-pill {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  background: rgba(119, 218, 205, 0.1);
  color: #146e61;
  padding: 8px 16px;
  border-radius: 999px;
  font-weight: 600;
  font-size: 20px;
}

.hero-gradient {
  background: linear-gradient(90deg, #77dacd 0%, #146e61 100%);
  -webkit-background-clip: text;
  color: transparent;
}

.hero-image {
  border-radius: 16px;
  box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25);
  overflow: hidden;
}

.hero-image img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
}

.hero-glow {
  position: absolute;
  right: 18%;
  top: 40px;
  width: 96px;
  height: 96px;
  background: rgba(119, 218, 205, 0.2);
  filter: blur(40px);
  border-radius: 999px;
}

.section-heading {
  display: flex;
  flex-direction: column;
  gap: 12px;
  align-items: center;
  text-align: center;
  margin-bottom: 36px;
}

.section-heading h2 {
  font-family: "Poppins", sans-serif;
  font-weight: 600;
  font-size: 32px;
  color: #146e61;
}

.section-heading p,
.section-description {
  color: #666666;
  font-weight: 400;
  font-size: 16px;
  max-width: 768px;
}

.section-underline {
  width: 80px;
  height: 4px;
  border-radius: 999px;
  background: linear-gradient(90deg, #77dacd 0%, #146e61 100%);
}

.section-underline.light {
  background: #77dacd;
}

.education-section {
  background: #ffffff;
  border-bottom: 1px solid #e5e5e5;
  padding: 64px 0;
}

.education-levels {
  display: flex;
  flex-wrap: wrap;
  gap: 16px;
  justify-content: center;
}

.level-pill {
  padding: 12px 24px;
  border-radius: 10px;
  border: 2px solid rgba(119, 218, 205, 0.3);
  color: #146e61;
  font-weight: 600;
  background: linear-gradient(90deg, #f6fffd 0%, #ffffff 100%);
}

.about-section {
  padding: 72px 0;
}

.about-content {
  display: flex;
  flex-direction: column;
  gap: 24px;
}

blockquote {
  border-left: 4px solid #77dacd;
  padding: 24px 28px;
  border-radius: 14px;
  background: linear-gradient(90deg, #f6fffd 0%, #ffffff 100%);
  font-weight: 500;
  color: #146e61;
}

blockquote span {
  display: block;
  text-align: right;
  color: #333333;
  margin-top: 8px;
}

.about-text p {
  color: #333333;
  font-weight: 400;
  font-size: 16px;
  margin-bottom: 16px;
  text-align: justify;
  line-height: 1.8;
}

.about-text span {
  color: #146e61;
  font-weight: 700;
}

.facility-section {
  padding: 72px 0;
  background: linear-gradient(156deg, #f6fffd 0%, #ffffff 100%);
}

.facility-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 32px;
}

.facility-card {
  background: #ffffff;
  border: 1px solid #e5e5e5;
  border-radius: 16px;
  padding: 32px;
  display: flex;
  gap: 24px;
  box-shadow: 0 10px 7.5px rgba(0, 0, 0, 0.1), 0 4px 3px rgba(0, 0, 0, 0.1);
}

.facility-icon {
  width: 48px;
  height: 48px;
  flex-shrink: 0;
  border-radius: 10px;
  background: #77dacd;
  display: grid;
  place-items: center;
}

.facility-icon img {
  width: 24px;
  height: 24px;
  filter: brightness(0) invert(1);
}

.facility-card h3 {
  font-family: "Poppins", sans-serif;
  font-weight: 600;
  color: #146e61;
  margin-bottom: 12px;
}

.facility-card p {
  color: #666666;
  font-weight: 400;
  font-size: 16px;
  text-align: justify;
  line-height: 1.6;
}

.program-section {
  padding: 72px 0;
}

.program-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 32px;
}

.program-card {
  border: 1px solid #e5e5e5;
  border-radius: 16px;
  padding: 32px;
  box-shadow: 0 10px 7.5px rgba(0, 0, 0, 0.1), 0 4px 3px rgba(0, 0, 0, 0.1);
}

.program-icon {
  width: 48px;
  height: 48px;
  border-radius: 10px;
  background: #77dacd;
  display: grid;
  place-items: center;
  margin-bottom: 24px;
}

.program-icon img {
  width: 24px;
  height: 24px;
  filter: brightness(0) invert(1);
}

.program-card h3 {
  font-family: "Poppins", sans-serif;
  font-weight: 600;
  color: #146e61;
  margin-bottom: 12px;
}

.program-card p {
  color: #666666;
  font-weight: 400;
  margin-bottom: 16px;
}

.program-card ul {
  list-style: none;
  padding: 0;
  margin: 0;
  color: #666666;
  font-weight: 400;
}

.program-card li {
  display: flex;
  gap: 8px;
  align-items: flex-start;
  margin-bottom: 8px;
}

.program-card li::before {
  content: "•";
  color: #77dacd;
  font-size: 20px;
  line-height: 1;
}

.impact-section {
  padding: 72px 0;
  background: linear-gradient(165deg, #146e61 0%, #0d5549 100%);
  color: #ffffff;
}

.impact-section .section-heading h2 {
  color: #ffffff;
}

.impact-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 24px;
  text-align: center;
}

.impact-item {
  padding: 24px;
}

.impact-value {
  display: block;
  font-family: "Poppins", sans-serif;
  font-size: 36px;
  font-weight: 700;
  color: #77dacd;
}

.impact-label {
  color: rgba(255, 255, 255, 0.9);
  font-weight: 500;
}

.activity-section {
  padding: 72px 0;
}

.activity-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 32px;
}

.activity-card {
  border: 1px solid #e5e5e5;
  border-radius: 16px;
  overflow: hidden;
  box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -4px rgba(0, 0, 0, 0.1);
  cursor: pointer;
  transition: transform 0.2s ease, box-shadow 0.2s ease;
}

.activity-card:hover {
  transform: translateY(-4px);
  box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04);
}

.activity-card:hover {
  transform: translateY(-4px);
  box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04);
}

.activity-image {
  position: relative;
  height: 256px;
  background: #f0f4f4;
}

.activity-image img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
}

.activity-body {
  padding: 24px;
}

.activity-body h3 {
  font-family: "Poppins", sans-serif;
  font-weight: 600;
  color: #146e61;
  margin-bottom: 12px;
}

.activity-body p {
  color: #666666;
  font-weight: 400;
  margin-bottom: 16px;
}

.activity-meta {
  display: flex;
  gap: 16px;
  color: #146e61;
  font-weight: 500;
  font-size: 14px;
}

.activity-meta div {
  display: flex;
  align-items: center;
  gap: 8px;
}

.activity-meta img {
  width: 16px;
  height: 16px;
}

.activity-cta {
  display: flex;
  justify-content: center;
  margin-top: 32px;
}

.btn-gradient {
  background: linear-gradient(90deg, #146e61 0%, #77dacd 100%);
  color: #ffffff;
  padding: 12px 24px;
}

.btn-gradient img {
  width: 20px;
  height: 20px;
}

.involvement-section {
  padding: 72px 0;
  background: linear-gradient(157deg, #f6fffd 0%, #ffffff 100%);
}

.involvement-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 32px;
}

.involvement-card {
  border: 2px solid rgba(119, 218, 205, 0.2);
  border-radius: 16px;
  padding: 32px;
  background: linear-gradient(149deg, #f6fffd 0%, #ffffff 100%);
}

.involvement-icon {
  width: 48px;
  height: 48px;
  border-radius: 10px;
  background: #77dacd;
  display: grid;
  place-items: center;
  margin-bottom: 24px;
}

.involvement-icon img {
  width: 24px;
  height: 24px;
  filter: brightness(0) invert(1);
}

.involvement-card h3 {
  font-family: "Poppins", sans-serif;
  font-weight: 600;
  color: #146e61;
  margin-bottom: 12px;
}

.involvement-card p {
  color: #666666;
  font-weight: 400;
  margin-bottom: 24px;
}

.link-button {
  background: none;
  border: none;
  display: inline-flex;
  align-items: center;
  gap: 8px;
  color: #146e61;
  font-weight: 600;
  cursor: pointer;
  padding: 0;
}

.link-button img {
  width: 16px;
  height: 16px;
}

.landing-footer {
  background: #146e61;
  color: #ffffff;
  padding: 64px 0 32px;
}

.footer-top {
  display: flex;
  justify-content: space-between;
  gap: 64px;
}

.footer-brand img {
  width: 98px;
  height: 64px;
  object-fit: contain;
}

.footer-brand p {
  color: rgba(255, 255, 255, 0.8);
  font-weight: 400;
  margin-top: 16px;
  max-width: 520px;
}

.footer-contact h4 {
  font-family: "Poppins", sans-serif;
  font-weight: 600;
  margin-bottom: 16px;
}

.footer-contact ul {
  list-style: none;
  padding: 0;
  margin: 0 0 24px;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.footer-contact li {
  display: flex;
  gap: 12px;
  align-items: flex-start;
  color: rgba(255, 255, 255, 0.8);
  font-weight: 400;
}

.footer-contact img {
  width: 20px;
  height: 20px;
  margin-top: 2px;
}

.footer-social {
  display: flex;
  gap: 16px;
}

.footer-social a {
  display: grid;
  place-items: center;
  width: 40px;
  height: 40px;
  border-radius: 10px;
  background: rgba(255, 255, 255, 0.1);
}

.footer-social img {
  width: 20px;
  height: 20px;
}

.footer-bottom {
  border-top: 1px solid rgba(255, 255, 255, 0.1);
  margin-top: 32px;
  padding-top: 24px;
  text-align: center;
  color: rgba(255, 255, 255, 0.6);
  font-weight: 400;
}

@media (max-width: 1100px) {
  .hero-content,
  .facility-grid,
  .program-grid,
  .impact-grid,
  .activity-grid,
  .involvement-grid,
  .footer-top {
    grid-template-columns: 1fr;
  }

  .footer-top {
    flex-direction: column;
  }

  .hero-image {
    order: -1;
  }

  .nav-links {
    display: none;
  }
}

@media (max-width: 768px) {
  .landing-container {
    padding: 0 20px;
  }

  .hero-text h1 {
    font-size: 32px;
  }

  .hero-text p {
    font-size: 16px;
  }

  .hero-pill {
    font-size: 16px;
  }

  .section-heading h2 {
    font-size: 24px;
  }

  .education-levels {
    gap: 12px;
  }

  .activity-image {
    height: 200px;
  }
}
</style>
