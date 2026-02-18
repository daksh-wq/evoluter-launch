import {
    collection,
    doc,
    setDoc,
    addDoc,
    deleteDoc,
    getDocs,
    getDoc,
    query,
    where,
    orderBy,
    serverTimestamp,
    writeBatch,
    arrayUnion,
    arrayRemove
} from 'firebase/firestore';
import { db } from '../../../services/firebase';
import logger from '../../../utils/logger';

export const batchService = {
    /**
     * Create a new batch for an institution
     * @param {string} institutionId 
     * @param {string} name 
     */
    async createBatch(institutionId, name) {
        try {
            const batchRef = await addDoc(collection(db, 'institution_batches'), {
                creatorId: institutionId,
                name: name.trim(),
                studentCount: 0,
                createdAt: serverTimestamp()
            });
            return batchRef.id;
        } catch (error) {
            logger.error("Error creating batch:", error);
            throw error;
        }
    },

    /**
     * Delete a batch and its sub-collections (Note: Client-side delete of sub-collections is not auto, 
     * but we'll handle the main link. Large deletions should be a cloud function)
     * @param {string} batchId 
     */
    async deleteBatch(batchId) {
        try {
            await deleteDoc(doc(db, 'institution_batches', batchId));
            return true;
        } catch (error) {
            logger.error("Error deleting batch:", error);
            throw error;
        }
    },

    /**
     * Get all batches created by an institution
     * @param {string} institutionId 
     */
    async getInstitutionBatches(institutionId) {
        try {
            const q = query(
                collection(db, 'institution_batches'),
                where('creatorId', '==', institutionId),
                orderBy('createdAt', 'desc')
            );
            const snapshot = await getDocs(q);
            return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        } catch (error) {
            logger.error("Error fetching batches:", error);
            return [];
        }
    },

    /**
     * Add a student to a batch by email
     * @param {string} batchId 
     * @param {string} studentEmail 
     */
    async addStudentToBatch(batchId, studentEmail) {
        try {
            // 1. Find User by Email
            const usersRef = collection(db, 'users');
            const q = query(usersRef, where('email', '==', studentEmail));
            const querySnapshot = await getDocs(q);

            if (querySnapshot.empty) {
                throw new Error("Student not found. They must be registered first.");
            }

            const studentDoc = querySnapshot.docs[0];
            const studentId = studentDoc.id;
            const studentData = studentDoc.data();

            // 2. Add to Batch Members Subcollection
            const memberRef = doc(db, 'institution_batches', batchId, 'members', studentId);
            const batchDocRef = doc(db, 'institution_batches', batchId);
            const studentUserRef = doc(db, 'users', studentId);

            const batch = writeBatch(db);

            // A. Create Member Record
            batch.set(memberRef, {
                studentId,
                studentEmail: studentData.email,
                studentName: studentData.displayName || 'Unnamed Student',
                joinedAt: serverTimestamp(),
                status: 'active'
            });

            // B. Increment Batch Count
            // Note: FieldValue.increment is cleaner but writeBatch doesn't support it directly in update nicely mixed with set sometimes? 
            // Actually it does. Let's use the import if needed, or simple read-write if strict.
            // For production speed, we'll use a separate update or just trust the client count for now?
            // Let's use database triggers for counts generally, but here we can try to update.
            // Simplified: Just add the member. We can recalc counts on fetch if needed or use a cloud function.
            // Let's TRY to update the count here for immediate UI feedback.
            // db.updateDoc(batchDocRef, { studentCount: increment(1) }); -> Can't do inside batch easily without import.

            // C. Add Batch ID to Student's Profile (for "My Classroom")
            batch.update(studentUserRef, {
                enrolledBatches: arrayUnion(batchId)
            });

            await batch.commit();

            // Separate increment call to avoid batch complexity with FieldValue imports inside this file scope (if not imported)
            // But we can import it.
            const { increment, updateDoc } = await import('firebase/firestore');
            await updateDoc(batchDocRef, { studentCount: increment(1) });

            return { studentId, ...studentData };

        } catch (error) {
            logger.error("Error adding student to batch:", error);
            throw error;
        }
    },

    /**
     * Remove a student from a batch
     * @param {string} batchId 
     * @param {string} studentId 
     */
    async removeStudentFromBatch(batchId, studentId) {
        try {
            const batch = writeBatch(db);

            const memberRef = doc(db, 'institution_batches', batchId, 'members', studentId);
            const batchDocRef = doc(db, 'institution_batches', batchId);

            batch.delete(memberRef);

            await batch.commit();

            const { increment, updateDoc } = await import('firebase/firestore');
            await updateDoc(batchDocRef, { studentCount: increment(-1) });

            return true;
        } catch (error) {
            logger.error("Error removing student:", error);
            throw error;
        }
    },

    /**
     * Get all members of a batch
     * @param {string} batchId 
     */
    async getBatchMembers(batchId) {
        try {
            const membersRef = collection(db, 'institution_batches', batchId, 'members');
            const q = query(membersRef, orderBy('joinedAt', 'desc'));
            const snapshot = await getDocs(q);
            return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        } catch (error) {
            logger.error("Error fetching members:", error);
            return [];
        }
    },

    /**
     * Get batches the student is enrolled in
     * @param {string} studentId
     */
    async getStudentBatches(studentId) {
        try {
            const { collectionGroup } = await import('firebase/firestore');
            // Query the 'members' subcollection group
            const q = query(
                collectionGroup(db, 'members'),
                where('studentId', '==', studentId)
            );

            const snapshot = await getDocs(q);

            // For each member doc, we generally want the parent Batch data.
            // This is tricky in Firestore client-side.
            // We have to fetch the parent docs individually.
            const batchPromises = snapshot.docs.map(async (memberDoc) => {
                const batchRef = memberDoc.ref.parent.parent;
                if (batchRef) {
                    const batchSnap = await getDoc(batchRef);
                    if (batchSnap.exists()) {
                        return { id: batchSnap.id, ...batchSnap.data() };
                    }
                }
                return null;
            });

            const results = await Promise.all(batchPromises);
            return results.filter(b => b !== null);

        } catch (error) {
            logger.error("Error fetching student batches:", error);
            return [];
        }
    }
};
