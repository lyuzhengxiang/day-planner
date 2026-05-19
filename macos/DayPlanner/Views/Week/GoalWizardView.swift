import SwiftUI
import SwiftData

/// Sheet that drives the LLM-led goal interview. Phases:
///   initial → answering (×5) → reviewing → saving → done
struct GoalWizardView: View {
    @Environment(\.modelContext) private var modelContext
    @Environment(\.dismiss) private var dismiss
    @State private var viewModel = WeekViewModel()
    @State private var drafts: [GoalSessionService.GoalDraft] = []
    @State private var inputBuffer: String = ""

    var body: some View {
        VStack(alignment: .leading, spacing: 16) {
            header
            Divider()
            content
        }
        .padding(24)
        .frame(width: 620, height: 540)
        .background(Color.black.opacity(0.9))
        .preferredColorScheme(.dark)
    }

    private var header: some View {
        HStack {
            VStack(alignment: .leading, spacing: 4) {
                Text("Weekly Goal Setup")
                    .font(.system(.title3, design: .monospaced).weight(.semibold))
                Text(phaseSubtitle)
                    .font(.system(.caption, design: .monospaced))
                    .foregroundStyle(.secondary)
            }
            Spacer()
            Button("Cancel") {
                viewModel.reset()
                dismiss()
            }
            .buttonStyle(.plain)
            .foregroundStyle(.secondary)
        }
    }

    private var phaseSubtitle: String {
        switch viewModel.phase {
        case .idle:                       return "Step 1 of 7 — describe your focus"
        case .starting:                   return "Talking to the model…"
        case .answering(_, let n):        return "Question \(n) of \(GoalSessionService.totalQuestions)"
        case .finalizing:                 return "Drafting your goals…"
        case .reviewing:                  return "Review the suggested goals"
        case .saving:                     return "Saving…"
        case .done:                       return "Done"
        case .error:                      return "Something went wrong"
        }
    }

    @ViewBuilder
    private var content: some View {
        switch viewModel.phase {
        case .idle:
            initialPhase
        case .starting:
            busy("Generating the first question…")
        case .answering(let q, _):
            answeringPhase(question: q)
        case .finalizing:
            busy("Generating goals from your answers…")
        case .reviewing(let suggested):
            reviewingPhase(initial: suggested)
        case .saving:
            busy("Saving goals to this week…")
        case .done:
            donePhase
        case .error(let msg):
            errorPhase(msg)
        }
    }

    // MARK: - Phases

    private var initialPhase: some View {
        VStack(alignment: .leading, spacing: 12) {
            Text("What's your focus this week?")
                .font(.system(.body, design: .monospaced).weight(.semibold))
            Text("One or two sentences is enough — the model asks 5 follow-up questions to refine.")
                .font(.system(.caption, design: .monospaced))
                .foregroundStyle(.secondary)
            TextEditor(text: $viewModel.initialInput)
                .font(.system(.body, design: .monospaced))
                .scrollContentBackground(.hidden)
                .padding(8)
                .frame(minHeight: 120)
                .overlay(
                    RoundedRectangle(cornerRadius: 4)
                        .stroke(Color.secondary.opacity(0.3), lineWidth: 1)
                )
            HStack {
                Spacer()
                Button {
                    _Concurrency.Task { await viewModel.start(context: modelContext) }
                } label: {
                    Label("Start interview", systemImage: "sparkles")
                }
                .buttonStyle(.borderedProminent)
                .disabled(viewModel.initialInput.trimmingCharacters(in: .whitespaces).isEmpty)
            }
        }
    }

    private func answeringPhase(question: GoalQuestion) -> some View {
        VStack(alignment: .leading, spacing: 12) {
            Text(question.question)
                .font(.system(.body, design: .monospaced).weight(.semibold))

            ScrollView {
                VStack(spacing: 6) {
                    ForEach(Array(question.options.enumerated()), id: \.offset) { idx, option in
                        Button {
                            sendAnswer(option)
                        } label: {
                            HStack {
                                Text("\(idx + 1).")
                                    .font(.system(.callout, design: .monospaced))
                                    .foregroundStyle(.secondary)
                                Text(option)
                                    .font(.system(.body, design: .monospaced))
                                Spacer()
                            }
                            .padding(10)
                            .frame(maxWidth: .infinity, alignment: .leading)
                            .overlay(
                                RoundedRectangle(cornerRadius: 4)
                                    .stroke(Color.secondary.opacity(0.3), lineWidth: 1)
                            )
                        }
                        .buttonStyle(.plain)
                    }
                }
            }
            .frame(maxHeight: 280)

            HStack {
                TextField("Or type your own…", text: $viewModel.otherInput)
                    .textFieldStyle(.plain)
                    .font(.system(.body, design: .monospaced))
                    .padding(8)
                    .overlay(
                        RoundedRectangle(cornerRadius: 4)
                            .stroke(Color.secondary.opacity(0.3), lineWidth: 1)
                    )
                Button("Send") { sendAnswer(viewModel.otherInput) }
                    .disabled(viewModel.otherInput.trimmingCharacters(in: .whitespaces).isEmpty)
            }
        }
    }

    private func reviewingPhase(initial: [GoalSessionService.GoalDraft]) -> some View {
        VStack(alignment: .leading, spacing: 12) {
            ScrollView {
                VStack(alignment: .leading, spacing: 12) {
                    Text("Suggested goals")
                        .font(.system(.body, design: .monospaced).weight(.semibold))
                    ForEach(Array(workingDrafts(initial: initial).enumerated()), id: \.offset) { idx, _ in
                        draftRow(index: idx)
                    }
                }
                .frame(maxWidth: .infinity, alignment: .leading)
            }
            .onAppear { if drafts.isEmpty { drafts = initial } }
            .frame(maxHeight: .infinity)

            HStack {
                Button {
                    _Concurrency.Task { await viewModel.shuffle() }
                } label: { Label("Shuffle", systemImage: "shuffle") }
                    .buttonStyle(.bordered)

                Spacer()

                Button {
                    _Concurrency.Task {
                        await viewModel.save(drafts: drafts, context: modelContext)
                    }
                } label: {
                    Label("Save \(drafts.count) goals", systemImage: "checkmark.seal")
                }
                .buttonStyle(.borderedProminent)
                .disabled(drafts.isEmpty)
            }
        }
    }

    private func draftRow(index: Int) -> some View {
        HStack(spacing: 8) {
            TextField("Goal text", text: Binding(
                get: { drafts.indices.contains(index) ? drafts[index].text : "" },
                set: { drafts[index].text = $0 }
            ))
            .textFieldStyle(.plain)
            .font(.system(.body, design: .monospaced))
            .padding(8)
            .overlay(
                RoundedRectangle(cornerRadius: 4)
                    .stroke(Color.secondary.opacity(0.3), lineWidth: 1)
            )

            Picker("", selection: Binding(
                get: { drafts.indices.contains(index) ? drafts[index].priority : .medium },
                set: { drafts[index].priority = $0 }
            )) {
                ForEach(Urgency.allCases, id: \.self) { u in
                    Text(u.rawValue).tag(u)
                }
            }
            .pickerStyle(.menu)
            .frame(width: 110)

            Button {
                drafts.remove(at: index)
            } label: {
                Image(systemName: "trash")
            }
            .buttonStyle(.plain)
            .foregroundStyle(.red.opacity(0.8))
        }
    }

    private var donePhase: some View {
        VStack(spacing: 12) {
            Image(systemName: "checkmark.seal.fill")
                .font(.system(size: 36))
                .foregroundStyle(Color(red: 0.55, green: 0.85, blue: 0.55))
            Text("Goals saved for this week.")
                .font(.system(.title3, design: .monospaced))
            Button("Done") { dismiss() }
                .buttonStyle(.borderedProminent)
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity)
    }

    private func errorPhase(_ msg: String) -> some View {
        VStack(spacing: 10) {
            Image(systemName: "exclamationmark.triangle")
                .font(.system(size: 30))
                .foregroundStyle(.red.opacity(0.8))
            Text(msg)
                .font(.system(.body, design: .monospaced))
                .multilineTextAlignment(.center)
            Button("Retry") {
                viewModel.reset()
                drafts.removeAll()
            }
            .buttonStyle(.bordered)
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity)
    }

    private func busy(_ label: String) -> some View {
        VStack(spacing: 12) {
            ProgressView()
            Text(label)
                .font(.system(.callout, design: .monospaced))
                .foregroundStyle(.secondary)
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity)
    }

    // MARK: - Helpers

    private func sendAnswer(_ value: String) {
        let trimmed = value.trimmingCharacters(in: .whitespaces)
        guard !trimmed.isEmpty else { return }
        _Concurrency.Task { await viewModel.answer(trimmed, context: modelContext) }
    }

    private func workingDrafts(initial: [GoalSessionService.GoalDraft]) -> [GoalSessionService.GoalDraft] {
        drafts.isEmpty ? initial : drafts
    }
}
