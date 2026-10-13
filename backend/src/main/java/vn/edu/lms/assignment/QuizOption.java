package vn.edu.lms.assignment;

import jakarta.persistence.*;

@Entity
@Table(name = "quiz_options")
public class QuizOption {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "question_id", nullable = false)
    private Long questionId;

    @Column(name = "option_text", nullable = false, columnDefinition = "TEXT")
    private String optionText;

    @Column(name = "is_correct", nullable = false)
    private boolean isCorrect = false;

    @Column(nullable = false)
    private Integer position = 1;

    protected QuizOption() {}

    public QuizOption(Long questionId, String optionText, boolean isCorrect, Integer position) {
        this.questionId = questionId;
        this.optionText = optionText;
        this.isCorrect = isCorrect;
        this.position = position != null ? position : 1;
    }

    public Long getId() { return id; }
    public Long getQuestionId() { return questionId; }
    public String getOptionText() { return optionText; }
    public boolean isCorrect() { return isCorrect; }
    public Integer getPosition() { return position; }

    public void setOptionText(String optionText) { this.optionText = optionText; }
    public void setCorrect(boolean correct) { isCorrect = correct; }
    public void setPosition(Integer position) { this.position = position; }
}
