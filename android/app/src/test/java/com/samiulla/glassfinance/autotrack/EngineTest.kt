package com.samiulla.glassfinance.autotrack

import com.samiulla.glassfinance.autotrack.core.*
import org.junit.Assert.*
import org.junit.Test

class EngineTest {
    private fun parse(pkg: String, title: String?, text: String): ParsedPayment? =
        PaymentAppRegistry.find(pkg)?.parser?.parse(RawNotification(pkg, title, text, null, null, 1_700_000_000_000L))

    @Test fun parsesPaytmGpayAndAmazonPay() {
        val paytm = parse("net.one97.paytm", "Paid ₹50 to Sri Sai Tea Stall", "UPI Ref 432112345678")!!
        assertEquals(5000L, paytm.amountPaise); assertEquals(Direction.DEBIT, paytm.direction); assertEquals("432112345678", paytm.upiRef)
        val gpay = parse("com.google.android.apps.nbu.paisa.user", "Rahul paid you ₹500", "UPI Ref 732154698712")!!
        assertEquals(50000L, gpay.amountPaise); assertEquals(Direction.CREDIT, gpay.direction)
        val amz = parse("in.amazon.mShop.android.shopping", "Paid ₹299 to Swiggy", "via Amazon Pay UPI")!!
        assertEquals(29900L, amz.amountPaise); assertEquals(Direction.DEBIT, amz.direction)
    }

    @Test fun rejectsOtpAndPromoMessages() {
        assertNull(parse("com.google.android.apps.messaging", "SBI", "Your OTP is 482910 for Rs 500 txn. Do not share."))
        assertNull(parse("net.one97.paytm", "Offer", "Win cashback up to ₹500 on your next recharge!"))
    }

    @Test fun reconcilesUpiAndBankSmsIntoOneRecordAndSkipsDeleted() {
        val r = Reconciler()
        val upi = parse("net.one97.paytm", "Paid ₹250 to Swiggy", "UPI Ref 111222333444")!!
        val sms = parse("com.google.android.apps.messaging", "IDFC", "Rs.250.00 spent on IDFC First Bank Card xx1234 at Swiggy. UPI Ref 111222333444.")!!
        val c = r.reconcile(upi, emptyList()) as ReconcileResult.Created
        assertEquals(Verification.PROVISIONAL, c.tx.verification)
        val u = r.reconcile(sms, listOf(c.tx)) as ReconcileResult.Updated
        assertEquals(Verification.CONFIRMED, u.tx.verification); assertEquals(2, u.tx.sources.size)
        assertTrue(r.reconcile(sms, listOf(u.tx.copy(deleted = true))) is ReconcileResult.Created)
    }

    @Test fun categorizerRespectsUserRules() {
        val cat = Categorizer(mapOf(Categorizer.key("Sri Sai Tea Stall") to "cat_groceries"))
        assertEquals("cat_groceries", cat.categorize(TxKind.EXPENSE, "SRI SAI TEA STALL"))
        assertEquals("cat_transport", cat.categorize(TxKind.EXPENSE, "HPCL Petrol Pump"))
    }
}
