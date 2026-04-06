import { PrismaClient, Role, AuditStatus, Priority } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seed başlıyor...');

  // Admin kullanıcı oluştur
  const admin = await prisma.user.upsert({
    where: { username: 'admin' },
    update: {},
    create: {
      username: 'admin',
      fullName: 'Sistem Yöneticisi',
      role: Role.admin,
      isActive: true,
    },
  });
  console.log('✅ Admin kullanıcı oluşturuldu:', admin.username);

  // Manager kullanıcı oluştur
  const manager1 = await prisma.user.upsert({
    where: { username: 'ali.yilmaz' },
    update: {},
    create: {
      username: 'ali.yilmaz',
      fullName: 'Ali Yılmaz',
      role: Role.manager,
      isActive: true,
    },
  });

  const manager2 = await prisma.user.upsert({
    where: { username: 'fatma.kaya' },
    update: {},
    create: {
      username: 'fatma.kaya',
      fullName: 'Fatma Kaya',
      role: Role.manager,
      isActive: true,
    },
  });

  const manager3 = await prisma.user.upsert({
    where: { username: 'mehmet.demir' },
    update: {},
    create: {
      username: 'mehmet.demir',
      fullName: 'Mehmet Demir',
      role: Role.manager,
      isActive: true,
    },
  });
  console.log('✅ Kullanıcılar oluşturuldu');

  // Departmanlar
  const departments = [
    { name: 'Ameliyathane Birimi', description: 'Ameliyathane ve cerrahi birimler' },
    { name: 'Laboratuvar Hizmetleri', description: 'Klinik ve patoloji laboratuvarları' },
    { name: 'Teknik Servis', description: 'Medikal cihaz teknik bakım ve onarım' },
    { name: 'Temizlik Hizmetleri', description: 'Hastane temizlik ve dezenfeksiyon' },
    { name: 'Güvenlik', description: 'Tesis güvenlik hizmetleri' },
    { name: 'İdari İşler', description: 'Genel idari ve destek hizmetler' },
    { name: 'Bilgi İşlem', description: 'IT altyapı ve sistem yönetimi' },
  ];

  const createdDepts: Record<string, string> = {};
  for (const dept of departments) {
    const d = await prisma.department.upsert({
      where: { name: dept.name },
      update: {},
      create: {
        ...dept,
        createdBy: admin.id,
      },
    });
    createdDepts[dept.name] = d.id;
  }
  console.log('✅ Departmanlar oluşturuldu');

  // Konumlar
  const locations = [
    { name: 'Ameliyathane', description: 'Ana ameliyathane bloğu', floor: '3. Kat', building: 'A Blok' },
    { name: 'Acil Servis', description: 'Acil servis ve triaj alanı', floor: 'Zemin Kat', building: 'A Blok' },
    { name: 'Yoğun Bakım', description: 'Genel yoğun bakım ünitesi', floor: '4. Kat', building: 'A Blok' },
    { name: 'Laboratuvar', description: 'Klinik laboratuvar', floor: '1. Kat', building: 'B Blok' },
    { name: 'Röntgen & MR', description: 'Radyoloji ve görüntüleme bölümü', floor: '2. Kat', building: 'B Blok' },
    { name: 'Poliklinikler', description: 'Poliklinik odaları', floor: '1-2. Kat', building: 'C Blok' },
    { name: 'Mutfak & Yemekhane', description: 'Hasta ve personel yemekhane', floor: 'Bodrum Kat', building: 'A Blok' },
    { name: 'Fizik Tedavi', description: 'Fizik tedavi ve rehabilitasyon', floor: '1. Kat', building: 'C Blok' },
    { name: 'Eczane', description: 'Ana eczane deposu', floor: 'Zemin Kat', building: 'A Blok' },
    { name: 'Teknik Oda', description: 'Kazan dairesi ve teknik altyapı', floor: 'Bodrum Kat', building: 'D Blok' },
  ];

  const createdLocs: Record<string, string> = {};
  for (const loc of locations) {
    const l = await prisma.location.upsert({
      where: { name: loc.name },
      update: {},
      create: loc,
    });
    createdLocs[loc.name] = l.id;
  }
  console.log('✅ Konumlar oluşturuldu');

  // Örnek denetim kayıtları
  const sampleItems = [
    {
      title: 'Ameliyathane Havalandırma Filtre Değişimi',
      currentStatusDescription: 'Ameliyathane 1 ve 2 numaralı odalardaki HEPA filtreler aşınmış durumda. Son değişim 8 ay önce yapıldı.',
      actionRequired: 'HEPA filtreler acilen değiştirilmeli ve altı aylık periyodik kontrol programına alınmalıdır.',
      status: AuditStatus.devam_ediyor,
      priority: Priority.kritik,
      locationId: createdLocs['Ameliyathane'],
      responsibleDeptId: createdDepts['Teknik Servis'],
      assignedUserId: manager1.id,
      deadline: new Date('2024-12-15'),
      createdById: admin.id,
    },
    {
      title: 'Acil Servis Zemin Kaplama Hasarı',
      currentStatusDescription: 'Acil triaj alanında zemin kaplamasında kırık ve ayrışmalar mevcut. Kayma tehlikesi oluşturmaktadır.',
      actionRequired: 'Hasarlı zemin kaplaması yenilenmeli, geçici olarak uyarı levhaları konulmalıdır.',
      status: AuditStatus.beklemede,
      priority: Priority.yuksek,
      locationId: createdLocs['Acil Servis'],
      responsibleDeptId: createdDepts['Teknik Servis'],
      assignedUserId: manager2.id,
      deadline: new Date('2024-11-30'),
      createdById: admin.id,
    },
    {
      title: 'Laboratuvar Biyogüvenlik Dolabı Kalibrasyonu',
      currentStatusDescription: 'Lab 3\'teki biyogüvenlik kabini kalibrasyon sertifikası geçmiş. Cihaz çalışmaya devam ediyor ancak belgeler eksik.',
      actionRequired: 'Onaylı servis firması çağrılarak kalibrasyon ve sertifikasyon yaptırılmalıdır.',
      status: AuditStatus.tamamlandi,
      priority: Priority.yuksek,
      locationId: createdLocs['Laboratuvar'],
      responsibleDeptId: createdDepts['Laboratuvar Hizmetleri'],
      deadline: new Date('2024-10-31'),
      completionDate: new Date('2024-10-28'),
      createdById: admin.id,
    },
    {
      title: 'Yoğun Bakım Monitör Sistem Güncellemesi',
      currentStatusDescription: 'YBÜ\'deki hasta monitörleri eski yazılım versiyonunda çalışıyor. Üretici firma kritik güvenlik güncellemesi yayınladı.',
      actionRequired: 'Tüm monitörler planlı bakım döneminde güncellenmeli. Bilgi İşlem ile koordinasyon sağlanmalıdır.',
      status: AuditStatus.beklemede,
      priority: Priority.yuksek,
      locationId: createdLocs['Yoğun Bakım'],
      responsibleDeptId: createdDepts['Bilgi İşlem'],
      assignedUserId: manager3.id,
      deadline: new Date('2025-01-15'),
      createdById: admin.id,
    },
    {
      title: 'Mutfak Soğuk Hava Deposu Arızası',
      currentStatusDescription: 'Ana yemek deposundaki soğuk hava ünitesi zaman zaman kesintili çalışıyor. Sıcaklık alarmları tetikleniyor.',
      actionRequired: 'Kompresör ve termostat kontrolü yapılmalı, gerekirse tamamıyla değiştirilmeli.',
      status: AuditStatus.gecikti,
      priority: Priority.kritik,
      locationId: createdLocs['Mutfak & Yemekhane'],
      responsibleDeptId: createdDepts['Teknik Servis'],
      deadline: new Date('2024-09-30'),
      createdById: admin.id,
    },
    {
      title: 'Röntgen Bölümü Radyasyon Uyarı Levhaları',
      currentStatusDescription: 'CT odası girişindeki radyasyon uyarı levhaları eski standartlara göre yapılmış. Yeni sağlık bakanlığı yönetmeliğine uygun değil.',
      actionRequired: 'Güncel yönetmeliğe uygun levhalar temin edilip asılmalıdır.',
      status: AuditStatus.beklemede,
      priority: Priority.orta,
      locationId: createdLocs['Röntgen & MR'],
      responsibleDeptId: createdDepts['İdari İşler'],
      deadline: new Date('2025-02-28'),
      createdById: admin.id,
    },
    {
      title: 'Eczane İlaç Depo Nem Kontrolü',
      currentStatusDescription: 'Eczane deposunun nem oranı yüksek seyrediyor (%70+). İlaç saklama koşulları risk altında.',
      actionRequired: 'Nem giderici cihaz alınmalı, raf yerleşimi havalandırma prensiplerine göre düzenlenmeli.',
      status: AuditStatus.devam_ediyor,
      priority: Priority.yuksek,
      locationId: createdLocs['Eczane'],
      responsibleDeptId: createdDepts['Teknik Servis'],
      assignedUserId: manager1.id,
      deadline: new Date('2024-12-01'),
      createdById: admin.id,
    },
    {
      title: 'Fizik Tedavi Ekipman Temizlik Protokolü',
      currentStatusDescription: 'FTR ünitesindeki rehabilitasyon ekipmanlarının temizlik ve dezenfeksiyon süreçleri standart prosedürle yürütülmüyor.',
      actionRequired: 'Temizlik protokolü hazırlanmalı, personel eğitimi verilmeli ve kontrol listesi uygulamaya alınmalıdır.',
      status: AuditStatus.beklemede,
      priority: Priority.dusuk,
      locationId: createdLocs['Fizik Tedavi'],
      responsibleDeptId: createdDepts['Temizlik Hizmetleri'],
      deadline: new Date('2025-03-15'),
      createdById: admin.id,
    },
  ];

  for (const item of sampleItems) {
    await prisma.auditItem.upsert({
      where: {
        // Use a unique combination: we'll rely on title uniqueness within location
        // Since there's no compound unique, we check by title first
        id: (await prisma.auditItem.findFirst({
          where: { title: item.title, locationId: item.locationId, isDeleted: false }
        }))?.id || 'new',
      },
      update: {},
      create: item,
    });
  }
  console.log('✅ Örnek denetim kayıtları oluşturuldu');

  console.log('\n🎉 Seed tamamlandı!');
  console.log('👤 Admin giriş: kullanıcı adı = "admin"');
  console.log('👤 Manager giriş: "ali.yilmaz", "fatma.kaya", "mehmet.demir"');
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error('❌ Seed hatası:', e);
    await prisma.$disconnect();
    process.exit(1);
  });
