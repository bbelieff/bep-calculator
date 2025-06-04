import React, { useState, useRef } from "react";
import Papa from "papaparse";

export interface MenuItem {
  id: string;
  name: string;
  price: number;
  cost: number;
  costRate: number;
  discountRate: number;
  discountDays: boolean[]; // [월,화,수,목,금,토,일]
  isDiscount: boolean;
}

const defaultMenuItem = (): MenuItem => ({
  id: Date.now().toString(),
  name: "",
  price: 0,
  cost: 0,
  costRate: 0,
  discountRate: 0,
  discountDays: [false, false, false, false, false, false, false],
  isDiscount: false,
});

const days = ["월", "화", "수", "목", "금", "토", "일"];

const MenuManagement: React.FC = () => {
  const [menu, setMenu] = useState<MenuItem[]>([]);
  const [editId, setEditId] = useState<string | null>(null);
  const [editItem, setEditItem] = useState<MenuItem | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // 메뉴 추가
  const handleAdd = () => {
    setMenu([...menu, defaultMenuItem()]);
  };

  // 메뉴 삭제
  const handleDelete = (id: string) => {
    setMenu(menu.filter((item) => item.id !== id));
  };

  // 인라인 편집 시작
  const handleEdit = (item: MenuItem) => {
    setEditId(item.id);
    setEditItem({ ...item });
  };

  // 인라인 편집 취소
  const handleCancel = () => {
    setEditId(null);
    setEditItem(null);
  };

  // 인라인 편집 저장
  const handleSave = () => {
    if (!editItem) return;
    setMenu(menu.map((item) => (item.id === editItem.id ? editItem : item)));
    setEditId(null);
    setEditItem(null);
  };

  // 인라인 편집 값 변경
  const handleEditChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>,
    field: keyof MenuItem
  ) => {
    if (!editItem) return;
    let value: any = e.target.value;
    if (
      field === "price" ||
      field === "cost" ||
      field === "costRate" ||
      field === "discountRate"
    ) {
      value = Number(value);
    }
    setEditItem({ ...editItem, [field]: value });
  };

  // 할인 요일 체크박스 변경
  const handleDiscountDayChange = (idx: number) => {
    if (!editItem) return;
    const newDays = [...editItem.discountDays];
    newDays[idx] = !newDays[idx];
    setEditItem({ ...editItem, discountDays: newDays });
  };

  // 할인 적용 여부 변경
  const handleDiscountToggle = () => {
    if (!editItem) return;
    setEditItem({ ...editItem, isDiscount: !editItem.isDiscount });
  };

  // 일괄 마진 적용
  const handleBulkMargin = () => {
    const margin = Number(prompt("적용할 마진율(%)을 입력하세요", "70"));
    if (isNaN(margin)) return;
    setMenu((prevMenu) =>
      prevMenu.map((item) => ({
        ...item,
        costRate: margin,
        cost: Math.round(item.price * (1 - margin / 100)),
      }))
    );
  };

  // CSV 다운로드
  const handleDownload = () => {
    const csv = Papa.unparse(
      menu.map((item) => ({
        ...item,
        discountDays: item.discountDays.map((d) => (d ? "1" : "0")).join(""),
      }))
    );
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "menu.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  // CSV 업로드
  const handleUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    Papa.parse(file, {
      header: true,
      complete: (results) => {
        const rows = results.data as any[];
        const newMenu = rows.map((row) => ({
          id: row.id || Date.now().toString() + Math.random(),
          name: row.name || "",
          price: Number(row.price) || 0,
          cost: Number(row.cost) || 0,
          costRate: Number(row.costRate) || 0,
          discountRate: Number(row.discountRate) || 0,
          discountDays: (row.discountDays || "0000000")
            .split("")
            .map((d: string) => d === "1"),
          isDiscount: row.isDiscount === "true" || row.isDiscount === true,
        }));
        setMenu(newMenu);
      },
    });
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  return (
    <div style={{ maxWidth: 900, margin: "0 auto" }}>
      <h2>메뉴 관리</h2>
      <div style={{ marginBottom: 16 }}>
        <button onClick={handleAdd}>메뉴 추가</button>
        <button onClick={handleBulkMargin} style={{ marginLeft: 8 }}>
          일괄 마진 적용
        </button>
        <button onClick={handleDownload} style={{ marginLeft: 8 }}>
          CSV 다운로드
        </button>
        <input
          type="file"
          accept=".csv"
          ref={fileInputRef}
          style={{ display: "none" }}
          onChange={handleUpload}
        />
        <button
          onClick={() => fileInputRef.current?.click()}
          style={{ marginLeft: 8 }}
        >
          CSV 업로드
        </button>
      </div>
      <table border={1} cellPadding={4} style={{ width: "100%" }}>
        <thead>
          <tr>
            <th>이름</th>
            <th>가격</th>
            <th>원가</th>
            <th>마진율(%)</th>
            <th>할인여부</th>
            <th>할인율(%)</th>
            <th>할인 요일</th>
            <th>수정/삭제</th>
          </tr>
        </thead>
        <tbody>
          {menu.map((item) =>
            editId === item.id && editItem ? (
              <tr key={item.id}>
                <td>
                  <input
                    value={editItem.name}
                    onChange={(e) => handleEditChange(e, "name")}
                  />
                </td>
                <td>
                  <input
                    type="number"
                    value={editItem.price}
                    onChange={(e) => handleEditChange(e, "price")}
                  />
                </td>
                <td>
                  <input
                    type="number"
                    value={editItem.cost}
                    onChange={(e) => handleEditChange(e, "cost")}
                  />
                </td>
                <td>
                  <input
                    type="number"
                    value={editItem.costRate}
                    onChange={(e) => handleEditChange(e, "costRate")}
                  />
                </td>
                <td>
                  <input
                    type="checkbox"
                    checked={editItem.isDiscount}
                    onChange={handleDiscountToggle}
                  />
                </td>
                <td>
                  <input
                    type="number"
                    value={editItem.discountRate}
                    onChange={(e) => handleEditChange(e, "discountRate")}
                    disabled={!editItem.isDiscount}
                  />
                </td>
                <td>
                  {days.map((d, idx) => (
                    <label key={d} style={{ marginRight: 4 }}>
                      <input
                        type="checkbox"
                        checked={editItem.discountDays[idx]}
                        onChange={() => handleDiscountDayChange(idx)}
                        disabled={!editItem.isDiscount}
                      />
                      {d}
                    </label>
                  ))}
                </td>
                <td>
                  <button onClick={handleSave}>저장</button>
                  <button onClick={handleCancel} style={{ marginLeft: 4 }}>
                    취소
                  </button>
                </td>
              </tr>
            ) : (
              <tr key={item.id}>
                <td>{item.name}</td>
                <td>{item.price}</td>
                <td>{item.cost}</td>
                <td>{item.costRate}</td>
                <td>{item.isDiscount ? "O" : ""}</td>
                <td>{item.isDiscount ? item.discountRate : ""}</td>
                <td>
                  {item.isDiscount
                    ? item.discountDays
                        .map((v, i) => (v ? days[i] : ""))
                        .filter(Boolean)
                        .join(", ")
                    : ""}
                </td>
                <td>
                  <button onClick={() => handleEdit(item)}>수정</button>
                  <button
                    onClick={() => handleDelete(item.id)}
                    style={{ marginLeft: 4 }}
                  >
                    삭제
                  </button>
                </td>
              </tr>
            )
          )}
        </tbody>
      </table>
    </div>
  );
};

export default MenuManagement; 