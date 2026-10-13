package vn.edu.lms.assignment;

import jakarta.persistence.*;

@Entity
@Table(name = "quiz_questions")
public class QuizQuestion {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "assignment_id", nullable = false)
    private Long assignmentId;

    @Column(name = "question_text", nullable = false, columnDefinition = "TEXT")
    private String questionText;

    @Column(nullable = false)
    private Double points = 1.0;

    @Column(nullable = false)
    private Integer position = 1;

    protected QuizQuestion() {}

    public QuizQuestion(Long assignmentId, String questionText, Double points, Integer position) {
        this.assignmentId = assignmentId;
        this.questionText = questionText;
        this.points = points != null ? points : 1.0;
        this.position = position != null ? position : 1;
    }

    public Long getId() { return id; }
    public Long getAssignmentId() { return assignmentId; }
    public String getQuestionText() { return questionText; }
    public Double getPoints() { return points; }
    public Integer getPosition() { return position; }

    public void setQuestionText(String questionText) { this.questionText = questionText; }
    public void setPoints(Double points) { this.points = points; }
    public void setPosition(Integer position) { this.position = position; }
}
