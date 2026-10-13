"use client";

export interface QuizOptionDraft {
  text: string;
  isCorrect: boolean;
}

interface QuizOptionsBuilderProps {
  options: QuizOptionDraft[];
  onChange: (options: QuizOptionDraft[]) => void;
  disabled?: boolean;
}

/**
 * Trình soạn thảo các phương án trả lời trắc nghiệm:
 * - Hiển thị huy hiệu chữ cái A, B, C, D...
 * - Cho phép chọn đáp án đúng bằng nút bấm hoặc radio
 * - Cho phép thêm phương án (tối đa 6) và xóa bớt phương án (tối thiểu 2)
 * - Tự động duy trì chính xác 1 đáp án đúng
 * - Ngăn chặn submit form ngoài ý muốn khi nhấn Enter trong ô nhập
 */
export default function QuizOptionsBuilder({
  options,
  onChange,
  disabled = false,
}: QuizOptionsBuilderProps) {
  function handleSelectCorrect(index: number) {
    if (disabled) return;
    const updated = options.map((opt, i) => ({
      ...opt,
      isCorrect: i === index,
    }));
    onChange(updated);
  }

  function handleTextChange(index: number, newText: string) {
    if (disabled) return;
    const updated = options.map((opt, i) => (i === index ? { ...opt, text: newText } : opt));
    onChange(updated);
  }

  function handleAddOption() {
    if (disabled || options.length >= 6) return;
    onChange([
      ...options,
      {
        text: "",
        isCorrect: false,
      },
    ]);
  }

  function handleRemoveOption(index: number) {
    if (disabled || options.length <= 2) return;
    const isRemovingCorrect = options[index].isCorrect;
    const remaining = options.filter((_, i) => i !== index);

    // Nếu xóa mất đáp án đúng, tự động chọn đáp án đầu tiên còn lại làm đáp án đúng
    if (isRemovingCorrect && remaining.length > 0) {
      remaining[0] = { ...remaining[0], isCorrect: true };
    }
    onChange(remaining);
  }

  const correctIndex = options.findIndex(o => o.isCorrect);
  const correctLetter = correctIndex !== -1 ? String.fromCharCode(65 + correctIndex) : null;
  const isCorrectEmpty = correctIndex !== -1 && !options[correctIndex].text.trim();

  return (
    <div style={{ marginTop: "14px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px", flexWrap: "wrap", gap: "6px" }}>
        <label style={{ margin: 0, fontWeight: 600 }}>
          Các phương án lựa chọn ({options.length} phương án):
        </label>
        <span className="muted" style={{ fontSize: "12px" }}>
          Tích chọn ô tròn hoặc bấm nút để đánh dấu đáp án chính xác
        </span>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
        {options.map((opt, idx) => {
          const letter = String.fromCharCode(65 + idx);
          return (
            <div
              key={idx}
              className={`option-builder-row ${opt.isCorrect ? "is-correct" : ""}`}
            >
              {/* Huy hiệu A, B, C, D */}
              <span className="option-letter-badge">{letter}</span>

              {/* Nút chọn đáp án đúng */}
              <label
                className="option-correct-toggle"
                title={`Đánh dấu phương án ${letter} là đáp án đúng`}
              >
                <input
                  type="radio"
                  name="quiz-correct-option-radio"
                  checked={opt.isCorrect}
                  onChange={() => handleSelectCorrect(idx)}
                  disabled={disabled}
                />
                <span>{opt.isCorrect ? "✔ Đáp án đúng" : "Đáp án đúng?"}</span>
              </label>

              {/* Ô nhập nội dung phương án */}
              <div className="option-input-field">
                <input
                  type="text"
                  placeholder={`Nhập nội dung phương án ${letter}…`}
                  value={opt.text}
                  onChange={e => handleTextChange(idx, e.target.value)}
                  onKeyDown={e => {
                    // Ngăn submit form cha khi người dùng gõ Enter trong ô đáp án
                    if (e.key === "Enter") {
                      e.preventDefault();
                    }
                  }}
                  disabled={disabled}
                  required
                />
              </div>

              {/* Nút xóa phương án (chỉ hiện khi có nhiều hơn 2 phương án) */}
              {options.length > 2 && (
                <button
                  type="button"
                  className="option-delete-btn"
                  onClick={() => handleRemoveOption(idx)}
                  disabled={disabled}
                  title={`Xóa phương án ${letter}`}
                  aria-label={`Xóa phương án ${letter}`}
                >
                  ✕
                </button>
              )}
            </div>
          );
        })}
      </div>

      {/* Thông tin phản hồi trạng thái đáp án */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "10px", flexWrap: "wrap", gap: "10px", fontSize: "12px" }}>
        <div>
          {correctLetter ? (
            <span style={{ color: isCorrectEmpty ? "#b91c1c" : "#166534", fontWeight: 600 }}>
              {isCorrectEmpty ? (
                <>⚠️ Phương án {correctLetter} đang được chọn là đáp án đúng nhưng chưa nhập nội dung!</>
              ) : (
                <>✔ Đáp án đúng hiện tại: <strong>Phương án {correctLetter}</strong></>
              )}
            </span>
          ) : (
            <span style={{ color: "#b91c1c", fontWeight: 600 }}>
              ⚠️ Vui lòng chọn 1 phương án làm đáp án đúng!
            </span>
          )}
        </div>

        {/* Nút thêm phương án */}
        {options.length < 6 && (
          <button
            type="button"
            className="secondary"
            onClick={handleAddOption}
            disabled={disabled}
            style={{ fontSize: "12px", padding: "4px 10px" }}
          >
            + Thêm phương án ({String.fromCharCode(65 + options.length)})
          </button>
        )}
      </div>
    </div>
  );
}

/**
 * Hàm kiểm tra tính hợp lệ của câu hỏi trắc nghiệm trước khi thêm vào danh sách hoặc gửi lên API.
 * Trả về chuỗi thông báo lỗi nếu không hợp lệ, hoặc null nếu hợp lệ.
 */
export function validateQuizQuestion(
  questionText: string,
  points: number,
  options: QuizOptionDraft[]
): string | null {
  if (!questionText.trim()) {
    return "Vui lòng nhập nội dung câu hỏi.";
  }
  if (!points || points <= 0) {
    return "Điểm số của câu hỏi phải lớn hơn 0.";
  }
  if (options.length < 2) {
    return "Câu hỏi trắc nghiệm phải có ít nhất 2 phương án lựa chọn.";
  }

  // Kiểm tra từng phương án xem có bị để trống không
  for (let i = 0; i < options.length; i++) {
    const letter = String.fromCharCode(65 + i);
    if (!options[i].text.trim()) {
      return `Vui lòng nhập nội dung cho Phương án ${letter} (hoặc xóa bớt nếu không dùng).`;
    }
  }

  // Kiểm tra xem có đúng 1 đáp án đúng không
  const correctCount = options.filter(o => o.isCorrect).length;
  if (correctCount !== 1) {
    return "Vui lòng chọn chính xác 1 phương án làm đáp án đúng.";
  }

  return null;
}
