import { supabase } from "./supabase"

// 1. 최근 데이터 1개 불러오기
export async function loadLatestBEPData() {
  const { data, error } = await supabase
    .from("bep_data")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(1)

  if (error) {
    console.error("❌ 불러오기 실패:", error)
    return null
  }

  return data?.[0] || null
}

// 2. 현재 계산 데이터를 Supabase에 저장
export async function saveBEPData(name: string, data: object) {
  const { error } = await supabase.from("bep_data").insert([{ name, data }])
  if (error) {
    console.error("❌ 저장 실패:", error)
    alert("저장 실패: " + error.message)
  } else {
    alert("✅ Supabase 저장 완료!")
  }
}

// 3. 저장 내역 리스트 조회
export async function listSavedBEPData() {
  const { data, error } = await supabase
    .from("bep_data")
    .select("id, name, created_at")
    .order("created_at", { ascending: false })

  if (error) {
    console.error("❌ 저장 목록 불러오기 실패:", error)
    return []
  }

  return data || []
}
