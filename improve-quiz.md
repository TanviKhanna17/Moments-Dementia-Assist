# Memory Care Quiz 2.0: RAG-Integrated Therapeutic Tool (MVP)

## 1. Overview & Vision

Transform our basic photo recognition quiz into a **contextual memory exercise** that uses personal documents and stories to create meaningful questions. Instead of just "Who is this person?", we'll ask "Who helped you with your garden?" based on actual life stories from uploaded documents.

### Current Assets We'll Leverage

- ✅ **Working RAG System** with Google Gemini + FAISS
- ✅ **Document Processing** (PDFs → searchable chunks)
- ✅ **Personal Life Data** (family stories, medical info, daily routines)
- ✅ **Quiz Infrastructure** (basic Q&A with family member options)

### MVP Goals (Keep It Simple!)

1. **Generate contextual questions** from personal documents
2. **Combine with photo recognition** for richer memory exercises
3. **Track memory strength** for different life aspects (family, health, routines)
4. **Simple progress visualization** for patients and caregivers

---

## 2. Core Feature: RAG-Powered Question Generation

### Question Types We'll Generate

**From Document Content:**

- **Family Questions**: "Who is your daughter that lives in Chicago?" (from diary entries)
- **Memory Questions**: "What did you and Mary do in the garden?" (from life stories)
- **Health Questions**: "When do you take your heart medication?" (from medical notes)
- **Routine Questions**: "What do you usually eat for breakfast?" (from caretaker logs)
- **Historical Questions**: "Where did you work before retiring?" (from biography)

**Enhanced with Photos:**

- Show photo + ask: "This is Sarah. What does she like to bake?" (from documents)
- Show photo + ask: "Where did you and John go for your anniversary?" (from stories)

### Smart Question Generation Process

```python
# New service: app/services/contextual_quiz_service.py

1. RAG Document Analysis
   - Extract entities: family members, places, activities, dates
   - Identify relationships: "Sarah is daughter", "John loves fishing"
   - Find memorable events: birthdays, trips, hobbies

2. Question Template Matching
   - Family: "Who is your [relationship] that [activity/characteristic]?"
   - Memory: "What did you and [person] do [activity/location]?"
   - Health: "When do you [medical routine]?"
   - Context: "Where did you [event/activity]?"

3. Difficulty Levels
   - Easy: Direct facts ("Who is your wife?")
   - Medium: Context clues ("Who loves to cook Italian food?")
   - Hard: Detailed memories ("What happened on your 50th anniversary?")
```

---

## 3. Phase 1: Backend Integration (Week 1-2)

### Step 1: Enhance Quiz Service with RAG

**Create `app/services/contextual_quiz_service.py`:**

```python
class ContextualQuizService:
    def __init__(self):
        self.rag_service = RAGService()

    def generate_contextual_question(self, user_id: int, db: Session):
        """Generate a question based on user's documents + family photos"""

        # 1. Get available family members with photos
        family_members = get_family_members_with_photos(user_id, db)

        # 2. Use RAG to find interesting facts about family members
        context_data = self.extract_family_context(user_id, family_members)

        # 3. Generate question using context + photos
        return self.create_contextual_question(context_data, family_members)

    def extract_family_context(self, user_id: int, family_members: List[FamilyMember]):
        """Use RAG to find stories/facts about family members"""
        family_info = {}

        for member in family_members:
            # Search documents for mentions of this family member
            query = f"Tell me about {member.name}"
            context = self.rag_service.retrieve_relevant_context(query, user_id)
            family_info[member.id] = context

        return family_info
```

### Step 2: New Database Model for Enhanced Tracking

**Add to `models.py`:**

```python
class ContextualQuizSession(Base):
    __tablename__ = "contextual_quiz_sessions"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"))
    question_text = Column(String)  # "Who helped you with your garden?"
    question_context = Column(Text)  # RAG context used
    question_type = Column(Enum('family', 'memory', 'health', 'routine'))
    correct_answer = Column(String)  # "Sarah, my daughter"
    user_answer = Column(String)    # What user selected
    is_correct = Column(Boolean)
    confidence_score = Column(Float)  # How confident RAG was about context
    created_at = Column(DateTime, default=func.now())
```

### Step 3: Enhanced API Endpoints

**Add to `routers/quiz.py`:**

```python
@router.get("/contextual-question")
def get_contextual_question(
    question_type: Optional[str] = None,  # 'family', 'memory', 'health'
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Generate a contextual question using RAG + family photos"""
    return contextual_quiz_service.generate_contextual_question(
        current_user.id, db, question_type
    )

@router.post("/contextual-answer")
def submit_contextual_answer(
    answer: ContextualQuizAnswer,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Submit answer and get feedback with explanation"""
    return contextual_quiz_service.evaluate_answer(answer, current_user.id, db)

@router.get("/memory-strength/{family_member_id}")
def get_memory_strength(
    family_member_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get memory strength score for specific family member/topic"""
    return analytics_service.get_memory_strength(family_member_id, current_user.id, db)
```

---

## 4. Phase 2: Frontend Enhancement (Week 3)

### Enhanced Quiz Interface

**Update `components/FamilyMemberQuiz.tsx`:**

```typescript
interface ContextualQuestion {
  id: string;
  question_text: string; // "Who helped you with your garden?"
  question_type: "family" | "memory" | "health" | "routine";
  context_hint?: string; // Optional: "Think about who loves flowers"
  image_url?: string; // Optional: photo if relevant
  options: QuizOption[];
  background_story?: string; // For feedback: full context from RAG
}

// New question types
function renderContextualQuestion(question: ContextualQuestion) {
  return (
    <div className="contextual-quiz-card">
      <div className="question-type-badge">{question.question_type}</div>

      {question.image_url && (
        <img src={question.image_url} alt="Memory prompt" />
      )}

      <h2>{question.question_text}</h2>

      {question.context_hint && (
        <p className="hint">💡 {question.context_hint}</p>
      )}

      <div className="options">
        {question.options.map((option) => (
          <QuizOptionButton key={option.id} option={option} />
        ))}
      </div>
    </div>
  );
}
```

### Memory Strength Visualization

**Create `components/MemoryStrengthCard.tsx`:**

```typescript
function MemoryStrengthCard({ familyMember, memoryData }) {
  return (
    <Card className="memory-strength-card">
      <div className="family-member-info">
        <img src={familyMember.photo} />
        <h3>{familyMember.name}</h3>
      </div>

      <div className="memory-metrics">
        <ProgressBar label="Recognition" value={memoryData.recognition_score} />
        <ProgressBar
          label="Life Stories"
          value={memoryData.story_recall_score}
        />
        <ProgressBar
          label="Recent Memories"
          value={memoryData.recent_memory_score}
        />
      </div>

      <div className="insights">
        <p>💪 Strong: Remembers {familyMember.name}'s hobbies</p>
        <p>📚 Practice: Work on recent events together</p>
      </div>
    </Card>
  );
}
```

---

## 5. Phase 3: Simple Analytics (Week 4)

### Memory Progress Dashboard

**Create `components/MemoryProgressDashboard.tsx`:**

```typescript
function MemoryProgressDashboard() {
  return (
    <div className="memory-progress">
      <div className="overall-score">
        <h2>Memory Strength: 78%</h2>
        <p>+5% improvement this week</p>
      </div>

      <div className="category-scores">
        <ProgressCard title="Family" score={85} trend="+3" />
        <ProgressCard title="Health Routines" score={72} trend="+8" />
        <ProgressCard title="Life Stories" score={76} trend="+2" />
      </div>

      <div className="recent-activity">
        <h3>Recent Practice Sessions</h3>
        <SessionItem date="Today" questions={8} accuracy={75} />
        <SessionItem date="Yesterday" questions={12} accuracy={83} />
      </div>

      <div className="caregiver-insights">
        <h3>📋 For Caregivers</h3>
        <InsightCard
          type="positive"
          message="Great improvement remembering family birthdays!"
        />
        <InsightCard
          type="focus"
          message="Consider practicing medication routine more frequently"
        />
      </div>
    </div>
  );
}
```

---

## 6. Implementation Roadmap

### Week 1: Backend Foundation

- [ ] Create `ContextualQuizService` with RAG integration
- [ ] Add new database models for enhanced tracking
- [ ] Implement question generation from document context
- [ ] Create API endpoints for contextual questions

### Week 2: Question Intelligence

- [ ] Develop entity extraction from RAG documents
- [ ] Create question templates for different contexts
- [ ] Implement difficulty levels and adaptive selection
- [ ] Add memory strength calculation algorithms

### Week 3: Frontend Enhancement

- [ ] Update quiz interface for contextual questions
- [ ] Add memory strength visualization components
- [ ] Implement progress tracking UI
- [ ] Create caregiver insights dashboard

### Week 4: Polish & Testing

- [ ] Add error handling and edge cases
- [ ] Implement session management and breaks
- [ ] Test with real document data
- [ ] User experience refinements

---

## 7. Technical Implementation Details

### RAG Integration Strategy

```python
# How we'll generate questions from documents:

1. Document Analysis Phase:
   - Extract family member names, relationships, activities
   - Identify memorable events, routines, preferences
   - Create knowledge graph: Person → Attributes → Stories

2. Question Generation Phase:
   - Select family member with photos
   - Query RAG for their associated stories/facts
   - Generate contextual question using templates
   - Ensure question is answerable from options

3. Answer Evaluation Phase:
   - Check correctness against family member data
   - Provide rich feedback using document context
   - Update memory strength scores
   - Suggest follow-up practice areas
```

### Memory Strength Algorithm

```python
def calculate_memory_strength(user_id: int, family_member_id: int) -> float:
    """Simple but effective memory strength calculation"""

    recent_sessions = get_recent_quiz_sessions(user_id, family_member_id, days=30)

    if not recent_sessions:
        return 0.0

    # Weighted scoring: recent performance matters more
    total_score = 0
    total_weight = 0

    for session in recent_sessions:
        days_ago = (datetime.now() - session.created_at).days
        weight = max(1.0 - (days_ago / 30), 0.1)  # Decay over time

        score = 1.0 if session.is_correct else 0.0
        # Bonus for harder questions
        if session.question_type in ['memory', 'health']:
            score *= 1.2

        total_score += score * weight
        total_weight += weight

    return min(total_score / total_weight * 100, 100)
```

---
