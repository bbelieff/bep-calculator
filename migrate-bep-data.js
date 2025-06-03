// migrate-bep-data.js
const { createClient } = require('@supabase/supabase-js');

// 환경변수에 맞게 수정
const SUPABASE_URL = 'https://ogbuydbrxyyjddnuastn.supabase.co'; // 본인 프로젝트 URL
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9nYnV5ZGJyeHl5amRkbnVhc3RuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDg5Njc4ODYsImV4cCI6MjA2NDU0Mzg4Nn0.VhHQfA3p2RFrLG-Q78ST8yq-0C9bRgcZpY8iYaQGvbg'; // 서비스 롤 키(보안 주의, 노출 금지!)

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function migrate() {
  // 1. 모든 row 불러오기
  const { data: rows, error } = await supabase
    .from('bep_data')
    .select('id, data');

  if (error) {
    console.error('불러오기 실패:', error);
    return;
  }

  for (const row of rows) {
    const oldData = row.data || {};

    // 변환 로직
    const categories = Array.isArray(oldData.menuItems) ? oldData.menuItems : [];
    const depreciationItems =
      Array.isArray(oldData.depreciationItems) && oldData.depreciationItems.length > 0
        ? oldData.depreciationItems
        : Array.isArray(oldData.fixedCosts?.depreciation)
        ? oldData.fixedCosts.depreciation
        : [];
    const marketingCosts =
      Array.isArray(oldData.marketingCosts) && oldData.marketingCosts.length > 0
        ? oldData.marketingCosts
        : Array.isArray(oldData.fixedCosts?.advertising)
        ? oldData.fixedCosts.advertising
        : [];

    // 새 구조
    const newData = {
      categories,
      depreciationItems,
      marketingCosts,
    };

    // 2. 업데이트
    const { error: updateError } = await supabase
      .from('bep_data')
      .update({ data: newData })
      .eq('id', row.id);

    if (updateError) {
      console.error(`id=${row.id} 업데이트 실패:`, updateError);
    } else {
      console.log(`id=${row.id} 변환 성공`);
    }
  }
}

migrate();