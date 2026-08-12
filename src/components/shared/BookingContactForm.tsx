"use client";

import { Icon } from '@/components/shared/Icon';

// 예약자 연락처 입력 폼.
// 셀러브릭스 시절의 배송지 입력(ShippingForm — 우편번호/주소/상세주소/배송메모, 저장된 배송지 목록)을
// 대체한다. 라이브 점사는 배송이 없으므로 상담 안내를 받을 이름·연락처와 요청사항만 받는다.

export interface BookingContactData {
  name: string;
  phone: string;
  memo: string;
}

interface BookingContactFormProps {
  value: BookingContactData;
  onChange: (data: BookingContactData) => void;
}

// 한국 휴대폰 11자리 + 자동 하이픈. 비숫자 무시, 12자리 이상은 잘라냄.
export function formatPhone(input: string): string {
  const digits = input.replace(/\D/g, "").slice(0, 11);
  if (digits.length < 4) return digits;
  if (digits.length < 8) return `${digits.slice(0, 3)}-${digits.slice(3)}`;
  return `${digits.slice(0, 3)}-${digits.slice(3, 7)}-${digits.slice(7)}`;
}

export default function BookingContactForm({ value, onChange }: BookingContactFormProps) {
  const update = (field: keyof BookingContactData, val: string) => {
    onChange({ ...value, [field]: val });
  };

  return (
    <div className="bg-white rounded-xl border border-gray-100 p-4">
      <h3 className="text-sm font-bold text-gray-900 flex items-center gap-1.5 mb-3">
        <Icon name="MyPage" size={14} strokeWidth={1.5} /> 예약자 정보
      </h3>

      <div className="space-y-3">
        <div>
          <label className="text-xs text-gray-500 flex items-center gap-1 mb-1">
            <Icon name="MyPage" size={12} /> 예약자 이름 *
          </label>
          <input
            type="text"
            value={value.name}
            onChange={(e) => update("name", e.target.value)}
            placeholder="이름"
            className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:border-gray-400"
          />
        </div>

        <div>
          <label className="text-xs text-gray-500 flex items-center gap-1 mb-1">
            <Icon name="Phone" size={12} /> 연락처 *
          </label>
          <input
            type="tel"
            inputMode="numeric"
            value={value.phone}
            onChange={(e) => update("phone", formatPhone(e.target.value))}
            placeholder="010-0000-0000"
            maxLength={13}
            className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:border-gray-400"
          />
          <p className="text-[10px] text-gray-400 mt-1">상담 일정 안내와 알림톡이 이 번호로 발송됩니다.</p>
        </div>

        <div>
          <label className="text-xs text-gray-500 flex items-center gap-1 mb-1">
            <Icon name="File" size={12} /> 상담사에게 남길 요청사항
          </label>
          <input
            type="text"
            value={value.memo}
            onChange={(e) => update("memo", e.target.value)}
            placeholder="미리 알려주실 내용이 있다면 적어주세요 (선택)"
            className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:border-gray-400"
          />
        </div>
      </div>
    </div>
  );
}
