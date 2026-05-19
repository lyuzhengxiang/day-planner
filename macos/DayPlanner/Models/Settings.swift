import Foundation
import SwiftData

/// Singleton settings record. Application layer enforces "only one row" —
/// SwiftData does not natively support singletons.
///
/// Mirrors `Settings` from the original Prisma schema.
@Model
public final class AppSettings {
    public var iMessagePhone: String = ""
    public var emailAddress: String = ""
    public var morningTime: String = "06:30"
    public var middayTime: String = "12:30"
    public var eveningTime: String = "20:30"
    public var timezone: String = "America/Chicago"
    public var macLocalIp: String = ""
    public var appPort: String = "3000"
    public var createdAt: Date = Date()

    public init(
        iMessagePhone: String = "",
        emailAddress: String = "",
        morningTime: String = "06:30",
        middayTime: String = "12:30",
        eveningTime: String = "20:30",
        timezone: String = "America/Chicago",
        macLocalIp: String = "",
        appPort: String = "3000"
    ) {
        self.iMessagePhone = iMessagePhone
        self.emailAddress = emailAddress
        self.morningTime = morningTime
        self.middayTime = middayTime
        self.eveningTime = eveningTime
        self.timezone = timezone
        self.macLocalIp = macLocalIp
        self.appPort = appPort
    }

    /// Helper used by views to decide whether to show the first-run banner.
    public var needsContactSetup: Bool {
        iMessagePhone.trimmingCharacters(in: .whitespaces).isEmpty
            && emailAddress.trimmingCharacters(in: .whitespaces).isEmpty
    }
}
